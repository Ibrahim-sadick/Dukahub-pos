import { prisma } from '../lib/prisma';
import { permissionCatalog } from '../constants/permissions';

async function syncPermissions() {
  for (const permission of permissionCatalog) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description
      },
      create: {
        key: permission.key,
        module: permission.module,
        action: permission.action,
        description: permission.description
      }
    });
  }

  console.log(`Synced ${permissionCatalog.length} permissions.`);
}

syncPermissions()
  .catch((error) => {
    console.error('Failed to sync permissions', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
