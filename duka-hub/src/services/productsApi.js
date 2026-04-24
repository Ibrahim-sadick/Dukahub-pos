import { authenticatedApiRequest } from './authApi';
import { listRuntimeCacheKeys, readRuntimeCache, writeRuntimeCache } from './runtimeCache';

const PRODUCTS_KEY = 'inventoryItems';

// eslint-disable-next-line no-unused-vars
const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const readJson = (key, fallback) => {
  return readRuntimeCache(key, fallback);
};

const writeJson = (key, value) => {
  writeRuntimeCache(key, value);
};

const notifyDataUpdated = () => {
  try {
    window.dispatchEvent(new CustomEvent('dataUpdated'));
  } catch {}
};

const normalizeText = (value) => String(value || '').trim();

const toNumber = (value) => {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeKey = (value) => normalizeText(value).toLowerCase();

const normalizeStatusForUi = (value) => {
  const status = normalizeText(value).toUpperCase();
  if (status === 'INACTIVE') return 'inactive';
  if (status === 'ARCHIVED') return 'archived';
  return 'active';
};

const normalizeStatusForApi = (value) => {
  const status = normalizeText(value).toLowerCase();
  if (status === 'inactive') return 'INACTIVE';
  if (status === 'archived') return 'ARCHIVED';
  return 'ACTIVE';
};

const readCachedProducts = () => {
  const cached = readJson(PRODUCTS_KEY, []);
  return Array.isArray(cached) ? cached : [];
};

const forEachMovementStorage = (visitor) => {
  try {
    const keys = listRuntimeCacheKeys();
    for (let i = 0; i < keys.length; i += 1) {
      const key = String(keys[i] || '');
      if (!key.startsWith('stockIn_') && !key.startsWith('stockOut_')) continue;
      visitor(key, readJson(key, []));
    }
  } catch {}
};

const buildMovementStorageKey = (movement) => {
  const movementType = normalizeText(movement?.movementType).toLowerCase() === 'stock_out' ? 'stockOut_' : 'stockIn_';
  const itemType = normalizeText(movement?.itemType || movement?.category || 'general') || 'general';
  return `${movementType}${itemType}`;
};

const normalizeLocalMovement = (movement) => {
  const nextMovementType = normalizeText(movement?.movementType).toLowerCase() === 'stock_out' ? 'stock_out' : 'stock_in';
  const itemType = normalizeText(movement?.itemType || movement?.category || 'general') || 'general';
  const itemName = normalizeText(movement?.itemName || movement?.name);
  return {
    ...movement,
    movementType: nextMovementType,
    itemType,
    itemName,
    name: normalizeText(movement?.name || itemName),
    quantity: toNumber(movement?.quantity),
    unit: normalizeText(movement?.unit) || 'pcs',
    pricePerItem: toNumber(movement?.pricePerItem),
    date: normalizeText(movement?.date) || new Date().toISOString().slice(0, 10),
    createdAt: normalizeText(movement?.createdAt) || new Date().toISOString()
  };
};

const appendLocalMovements = (movements) => {
  const groups = new Map();
  (Array.isArray(movements) ? movements : []).forEach((movement) => {
    const normalized = normalizeLocalMovement(movement);
    if (!normalized.itemName || !(normalized.quantity > 0)) return;
    const key = buildMovementStorageKey(normalized);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(normalized);
  });

  let changed = false;
  groups.forEach((rows, key) => {
    const current = readJson(key, []);
    const next = [...(Array.isArray(current) ? current : []), ...rows];
    if (!sameJson(current, next)) {
      writeJson(key, next);
      changed = true;
    }
  });

  if (changed) notifyDataUpdated();
};

const readLocalMovements = () => {
  const movements = [];
  forEachMovementStorage((_key, value) => {
    (Array.isArray(value) ? value : []).forEach((entry) => {
      const normalized = normalizeLocalMovement(entry);
      if (!normalized.itemName || !(normalized.quantity > 0)) return;
      movements.push(normalized);
    });
  });
  return movements;
};

const removeLocalMovementsByReference = (referenceId) => {
  const ref = normalizeText(referenceId);
  if (!ref) return;
  let changed = false;
  forEachMovementStorage((key, value) => {
    const rows = Array.isArray(value) ? value : [];
    const next = rows.filter((row) => {
      const rowRef = normalizeText(row?.referenceId || row?.saleId);
      return rowRef !== ref;
    });
    if (!sameJson(rows, next)) {
      writeJson(key, next);
      changed = true;
    }
  });
  if (changed) notifyDataUpdated();
};

const removeLocalMovementsByItemName = (itemName) => {
  const target = normalizeKey(itemName);
  if (!target) return;
  let changed = false;
  forEachMovementStorage((key, value) => {
    const rows = Array.isArray(value) ? value : [];
    const next = rows.filter((row) => normalizeKey(row?.itemName || row?.name) !== target);
    if (!sameJson(rows, next)) {
      writeJson(key, next);
      changed = true;
    }
  });
  if (changed) notifyDataUpdated();
};

const removeCachedProduct = (productId, itemName) => {
  const id = normalizeText(productId);
  const target = normalizeKey(itemName);
  const cached = readCachedProducts();
  const next = cached.filter((entry) => {
    const entryId = normalizeText(entry?.id);
    const entryName = normalizeKey(entry?.name || entry?.itemName);
    if (id && entryId === id) return false;
    if (target && entryName === target) return false;
    return true;
  });
  writeJson(PRODUCTS_KEY, next);
  if (!sameJson(next, cached)) notifyDataUpdated();
  return next;
};

const sameJson = (left, right) => {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
};

const mergeCachedById = (incoming, cached) => {
  const nextList = Array.isArray(incoming) ? incoming : [];
  const currentList = Array.isArray(cached) ? cached : [];
  const incomingIds = new Set(nextList.map((entry) => String(entry?.id || '')).filter(Boolean));
  const preserved = currentList.filter((entry) => {
    const id = String(entry?.id || '');
    return id && !incomingIds.has(id);
  });
  return [...nextList, ...preserved];
};

const mapBackendProductToUi = (product) => {
  const costPrice = toNumber(product?.costPrice);
  const sellingPrice = toNumber(product?.sellingPrice);
  const metadata = product?.metadata && typeof product.metadata === 'object' ? product.metadata : {};
  return {
    id: String(product?.id || ''),
    name: normalizeText(product?.name),
    itemName: normalizeText(product?.name),
    sku: normalizeText(product?.sku),
    barcode: normalizeText(product?.barcode),
    category: normalizeText(product?.category || product?.productType || 'general') || 'general',
    itemType: normalizeText(product?.category || product?.productType || 'general') || 'general',
    productType: normalizeText(product?.productType || product?.category || 'general') || 'general',
    unit: normalizeText(product?.unit) || 'pcs',
    buyingPrice: costPrice,
    buyPrice: costPrice,
    costPrice,
    sellingPrice,
    price: costPrice,
    stockQuantity: toNumber(product?.stockQuantity),
    qty: toNumber(product?.stockQuantity),
    quantity: toNumber(product?.stockQuantity),
    reorderLevel: toNumber(product?.reorderLevel),
    description: normalizeText(product?.description),
    imageDataUrl: normalizeText(metadata?.imageDataUrl),
    status: normalizeStatusForUi(product?.status),
    persisted: true,
    createdAt: normalizeText(product?.createdAt),
    updatedAt: normalizeText(product?.updatedAt)
  };
};

const syncCachedProducts = (products) => {
  const mapped = (Array.isArray(products) ? products : []).map(mapBackendProductToUi).filter((entry) => entry.id);
  const cached = readCachedProducts();
  const merged = mergeCachedById(mapped, cached);
  writeJson(PRODUCTS_KEY, merged);
  if (!sameJson(merged, cached)) {
    notifyDataUpdated();
  }
  return merged;
};

const syncCachedProduct = (product) => {
  const nextProduct = mapBackendProductToUi(product);
  const cached = readCachedProducts();
  const merged = [nextProduct, ...cached.filter((entry) => String(entry?.id || '') !== String(nextProduct.id || ''))];
  writeJson(PRODUCTS_KEY, merged);
  if (!sameJson(merged, cached)) {
    notifyDataUpdated();
  }
  return nextProduct;
};

const buildProductPayload = (payload) => {
  const source = payload && typeof payload === 'object' ? payload : {};
  const metadata = source?.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const imageDataUrl = normalizeText(source?.imageDataUrl || metadata?.imageDataUrl);
  return {
    name: normalizeText(source?.name || source?.itemName),
    sku: normalizeText(source?.sku) || undefined,
    barcode: normalizeText(source?.barcode) || undefined,
    category: normalizeText(source?.category || source?.productType) || undefined,
    productType: normalizeText(source?.productType || source?.category) || undefined,
    unit: normalizeText(source?.unit) || 'pcs',
    costPrice: toNumber(source?.costPrice ?? source?.buyingPrice ?? source?.price),
    sellingPrice: toNumber(source?.sellingPrice),
    stockQuantity: toNumber(source?.stockQuantity),
    reorderLevel: toNumber(source?.reorderLevel || 10),
    sellable: source?.sellable ?? true,
    description: normalizeText(source?.description) || undefined,
    status: normalizeStatusForApi(source?.status),
    metadata: imageDataUrl ? { ...metadata, imageDataUrl } : Object.keys(metadata).length ? metadata : undefined
  };
};

const buildLocalMovementFingerprint = (movement) => {
  const id = normalizeText(movement?.id);
  if (id) return `id:${id}`;
  return [
    normalizeText(movement?.movementType).toLowerCase(),
    normalizeKey(movement?.itemName || movement?.name),
    toNumber(movement?.quantity),
    normalizeText(movement?.date || movement?.createdAt),
    normalizeText(movement?.referenceId),
    toNumber(movement?.pricePerItem)
  ].join('|');
};

const classifyMovementType = (movement) => {
  const rawType = normalizeText(movement?.rawMovementType || movement?.movementType).toUpperCase();
  if (rawType === 'STOCK_OUT' || rawType.endsWith('_OUT')) return 'stock_out';
  if (rawType === 'STOCK_IN' || rawType.endsWith('_IN') || rawType === 'OPENING_BALANCE') return 'stock_in';
  const quantityDelta = Number(movement?.quantityDelta);
  if (Number.isFinite(quantityDelta)) return quantityDelta < 0 ? 'stock_out' : 'stock_in';
  return rawType.toLowerCase().includes('out') ? 'stock_out' : 'stock_in';
};

const mapBackendMovementToUi = (movement, product) => {
  const quantityDelta = toNumber(movement?.quantityDelta);
  const movementTypeRaw = normalizeText(movement?.movementType).toUpperCase();
  const normalizedType = classifyMovementType({ ...movement, rawMovementType: movementTypeRaw, quantityDelta });
  return {
    id: normalizeText(movement?.id),
    productId: normalizeText(movement?.productId || product?.id),
    itemName: normalizeText(product?.name || movement?.productName),
    name: normalizeText(product?.name || movement?.productName),
    quantity: Math.abs(quantityDelta),
    unit: normalizeText(movement?.unit || product?.unit) || 'pcs',
    pricePerItem: normalizedType === 'stock_out' ? toNumber(movement?.unitPrice) : toNumber(movement?.unitCost),
    date: normalizeText(movement?.createdAt || movement?.movementDate),
    createdAt: normalizeText(movement?.createdAt || movement?.movementDate),
    referenceId: normalizeText(movement?.referenceId),
    referenceType: normalizeText(movement?.referenceType),
    note: normalizeText(movement?.notes),
    itemType: normalizeText(product?.category || product?.productType || 'general') || 'general',
    movementType: normalizedType,
    rawMovementType: movementTypeRaw
  };
};

export const productsApi = {
  async list() {
    try {
      const data = await authenticatedApiRequest('/products');
      return syncCachedProducts(data?.products);
    } catch {
      return readCachedProducts();
    }
  },

  async create(payload) {
    const body = buildProductPayload(payload);
    const data = await authenticatedApiRequest('/products', {
      method: 'POST',
      body
    });
    return syncCachedProduct(data?.product);
  },

  async patch(productId, patch) {
    const id = String(productId || '');
    if (!id) throw new Error('Product not found');
    const body = buildProductPayload(patch);
    const existing = readCachedProducts().find((entry) => String(entry?.id || '') === id);
    if (existing?.persisted === false) {
      throw new Error('This product exists only in local cache. Recreate it after reconnecting to the server.');
    }
    const data = await authenticatedApiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body
    });
    return syncCachedProduct(data?.product);
  },

  async listMovements(productId) {
    const id = String(productId || '');
    if (!id) return [];
    try {
      const data = await authenticatedApiRequest(`/products/${encodeURIComponent(id)}/movements`);
      return Array.isArray(data?.movements) ? data.movements : [];
    } catch {
      const product = readCachedProducts().find((entry) => String(entry?.id || '') === id);
      const target = normalizeKey(product?.name || product?.itemName);
      const movements = [];
      forEachMovementStorage((_key, value) => {
        (Array.isArray(value) ? value : []).forEach((entry) => {
          if (normalizeKey(entry?.itemName || entry?.name) === target) {
            movements.push(entry);
          }
        });
      });
      return movements;
    }
  },

  async loadInventorySnapshot() {
    const items = await this.list();
    const localMovements = readLocalMovements();
    const persistedItems = (Array.isArray(items) ? items : []).filter((item) => item?.persisted && item?.id);
    const movementLists = persistedItems.length > 0
      ? await Promise.all(
          persistedItems.map(async (item) => {
            const movements = await this.listMovements(item.id);
            return (Array.isArray(movements) ? movements : []).map((movement) => mapBackendMovementToUi(movement, item));
          })
        )
      : [];

    const mergedMovements = [...movementLists.flat(), ...localMovements];
    const seen = new Set();
    const dedupedMovements = mergedMovements.filter((movement) => {
      const key = buildLocalMovementFingerprint(movement);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      items: Array.isArray(items) ? items : [],
      movements: dedupedMovements
    };
  },

  async stockIn(productId, payload = {}) {
    const id = String(productId || '');
    if (!id) throw new Error('Product not found');
    const existing = readCachedProducts().find((entry) => String(entry?.id || '') === id);
    if (existing?.persisted === false) {
      throw new Error('This product exists only in local cache. Recreate it after reconnecting to the server.');
    }
    const quantity = toNumber(payload?.quantity);
    if (!(quantity > 0)) throw new Error('Enter stock quantity');
    const unitCost = toNumber(payload?.unitCost);
    const notes = normalizeText(payload?.notes) || 'Stock in';
    const data = await authenticatedApiRequest(`/products/${encodeURIComponent(id)}/stock-in`, {
      method: 'POST',
      body: {
        quantity,
        unitCost,
        notes
      }
    });
    const product = data?.product ? syncCachedProduct(data.product) : readCachedProducts().find((entry) => String(entry?.id || '') === id) || null;
    return {
      product,
      movement: data?.movement && product ? mapBackendMovementToUi(data.movement, product) : null
    };
  },

  async stockOut(productId, payload = {}) {
    const id = String(productId || '');
    if (!id) throw new Error('Product not found');
    const existing = readCachedProducts().find((entry) => String(entry?.id || '') === id);
    if (existing?.persisted === false) {
      throw new Error('This product exists only in local cache. Recreate it after reconnecting to the server.');
    }
    const quantity = toNumber(payload?.quantity);
    if (!(quantity > 0)) throw new Error('Enter stock quantity');
    const unitPrice = toNumber(payload?.unitPrice);
    const notes = normalizeText(payload?.notes) || 'Stock out';
    const data = await authenticatedApiRequest(`/products/${encodeURIComponent(id)}/stock-out`, {
      method: 'POST',
      body: {
        quantity,
        unitPrice,
        notes
      }
    });
    const product = data?.product ? syncCachedProduct(data.product) : readCachedProducts().find((entry) => String(entry?.id || '') === id) || null;
    return {
      product,
      movement: data?.movement && product ? mapBackendMovementToUi(data.movement, product) : null
    };
  },

  async remove(productId) {
    const id = String(productId || '');
    if (!id) throw new Error('Product not found');
    const existing = readCachedProducts().find((entry) => String(entry?.id || '') === id);
    if (!existing) throw new Error('Product not found');

    if (existing?.persisted === false) {
      removeCachedProduct(id, existing?.name || existing?.itemName);
      removeLocalMovementsByItemName(existing?.name || existing?.itemName);
      return true;
    }
    await authenticatedApiRequest(`/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    removeCachedProduct(id, existing?.name || existing?.itemName);
    removeLocalMovementsByItemName(existing?.name || existing?.itemName);
    return true;
  },

  async ensureForPurchaseItems(items) {
    const rows = Array.isArray(items) ? items : [];
    if (rows.length === 0) return rows;

    const catalog = await this.list().catch(() => []);

    const byName = new Map(
      (Array.isArray(catalog) ? catalog : [])
        .map((entry) => [normalizeKey(entry?.name || entry?.itemName), entry])
        .filter(([key]) => Boolean(key))
    );

    const resolved = [];
    for (const item of rows) {
      const itemName = normalizeText(item?.item || item?.itemName || item?.name);
      const key = normalizeKey(itemName);
      const existing = key ? byName.get(key) : null;

      if (existing?.id) {
        resolved.push({
          ...item,
          productId: String(item?.productId || existing.id),
          category: normalizeText(item?.category || existing.category || existing.productType || 'general') || 'general'
        });
        continue;
      }

      try {
        const created = await this.create({
          name: itemName,
          category: normalizeText(item?.category || 'general') || 'general',
          productType: normalizeText(item?.category || item?.productType || 'general') || 'general',
          unit: normalizeText(item?.unit) || 'pcs',
          costPrice: toNumber(item?.price ?? item?.costPrice),
          stockQuantity: 0,
          metadata: { source: 'purchase-sync' }
        });

        resolved.push({
          ...item,
          productId: created?.persisted ? String(created.id || '') : normalizeText(item?.productId),
          category: normalizeText(item?.category || created?.category || 'general') || 'general'
        });
        if (created?.id) byName.set(key, created);
      } catch {
        resolved.push(item);
      }
    }

    return resolved;
  },

  async findByName(name) {
    const key = normalizeKey(name);
    if (!key) return null;
    const catalog = await this.list().catch(() => []);
    return (Array.isArray(catalog) ? catalog : []).find((entry) => normalizeKey(entry?.name || entry?.itemName) === key) || null;
  },

  appendLocalMovements(movements) {
    appendLocalMovements(movements);
  },

  removeLocalMovementsByReference(referenceId) {
    removeLocalMovementsByReference(referenceId);
  },

  removeLocalMovementsByItemName(itemName) {
    removeLocalMovementsByItemName(itemName);
  }
};
