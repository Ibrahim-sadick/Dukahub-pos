import React, { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import DateInput from '../shared/DateInput';
import InvoicePrint from '../shared/InvoicePrint';
import { flushSync } from 'react-dom';
 
const safeJsonParse = (raw, fallback) => {
  try {
    return JSON.parse(String(raw ?? ''));
  } catch {
    return fallback;
  }
};

const localStore = {
  get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(String(key || ''));
      if (raw == null) return fallback;
      return safeJsonParse(raw, fallback);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    void safeJsonParse;
    try {
      window.localStorage.setItem(String(key || ''), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};

const getStoredJson = (key, fallback) => localStore.get(key, fallback);
const setStoredJson = (key, value) => Promise.resolve(localStore.set(key, value));


const Invoice = () => {
  const [activeTab, setActiveTab] = useState('generator');
  const [isLoading, setIsLoading] = useState(false);
  const generateInvoiceNumber = () => {
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `INV-${randomNum}`;
  };

  const generatePONumber = () => {
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `PO-${randomNum}`;
  };

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: generateInvoiceNumber(),
    date: new Date().toISOString().split('T')[0],
    paymentTerms: '',
    dueDate: '',
    poNumber: generatePONumber(),
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    shipToName: '',
    shipToAddress: '',
    notes: '',
    terms: '',
    taxRate: 0,
    shipping: 0,
    amountPaid: 0,
    items: [{ item: '', qty: '', unit: 'tray', price: '', total: 0 }]
  });
  const [companyInfo, setCompanyInfo] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({
    amount: '',
    customerName: '',
    paymentMethod: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadCompanyInfo = () => {
      Promise.resolve()
        .then(async () => {
          const savedInfo = await getStoredJson('companyInfo', {});
          setCompanyInfo(savedInfo && typeof savedInfo === 'object' ? savedInfo : {});
        })
        .catch(() => setCompanyInfo({}));
    };

    loadCompanyInfo();

    // Load existing invoices
    Promise.resolve()
      .then(async () => {
        const existingInvoices = await getStoredJson('invoicedSales', []);
        setInvoices(Array.isArray(existingInvoices) ? existingInvoices : []);
      })
      .catch(() => setInvoices([]));

    // Listen for company info updates (when logo is changed in settings)
    const handleStorageChange = () => {
      loadCompanyInfo();
    };
    window.addEventListener('companyInfoUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('companyInfoUpdated', handleStorageChange);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      amount: '',
      customerName: '',
      paymentMethod: '',
      startDate: '',
      endDate: ''
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceData.items];
    newItems[index][field] = value;
    
    // Automatic calculation for total
    if (field === 'qty' || field === 'price' || field === 'unit') {
      const qty = parseFloat(newItems[index].qty) || 0;
      const price = parseFloat(newItems[index].price) || 0;
      const unit = newItems[index].unit;
      
      // Calculate total based on unit
      let total = 0;
      if (unit === 'tray') {
        total = qty * price; // 1 tray = 30 pieces
      } else if (unit === 'piece') {
        total = qty * price; // Direct piece calculation
      }
      
      newItems[index].total = total.toFixed(2);
    }
    
    setInvoiceData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { item: '', qty: '', unit: 'tray', price: '', total: 0 }]
    }));
  };


  const calculateTotal = () => {
    return invoiceData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  };




  const generatePDF = async () => {
    setIsLoading(true);
    try {
      const existingInvoices = Array.isArray(await getStoredJson('invoicedSales', [])) ? await getStoredJson('invoicedSales', []) : [];
      const subtotal = calculateTotal();
      const tax = (subtotal * (invoiceData.taxRate || 0)) / 100;
      const shipping = parseFloat(invoiceData.shipping || 0);
      const finalTotal = subtotal + tax + shipping;
      const amountPaid = parseFloat(invoiceData.amountPaid || 0);
      const balanceDue = finalTotal - amountPaid;

      const newInvoice = {
        id: Date.now(),
        invoiceNumber: invoiceData.invoiceNumber,
        poNumber: invoiceData.poNumber,
        customerName: invoiceData.customerName,
        customerEmail: invoiceData.customerEmail,
        customerPhone: invoiceData.customerPhone,
        customerAddress: invoiceData.customerAddress,
        date: invoiceData.date,
        paymentTerms: invoiceData.paymentTerms,
        dueDate: invoiceData.dueDate,
        items: invoiceData.items,
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        finalTotal: finalTotal,
        amountPaid: amountPaid,
        balanceDue: balanceDue,
        status: amountPaid >= finalTotal ? 'Paid' : 'Not Paid'
      };

      const updatedInvoices = [...existingInvoices, newInvoice];
      void setStoredJson('invoicedSales', updatedInvoices).catch(() => {});
      setInvoices(updatedInvoices);

      window.dispatchEvent(new CustomEvent('dataUpdated'));
    } finally {
      setIsLoading(false);
    }
  };



  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Add print styles to the document
  useEffect(() => {
    const printStyles = document.createElement('style');
    printStyles.textContent = `
      .invoice-print-preview.hidden {
        display: none;
      }
      @page {
        margin: 0;
        size: A4;
      }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
        }
        body * {
          visibility: hidden !important;
        }
        .invoice-print-preview, .invoice-print-preview * {
          visibility: visible !important;
        }
        .invoice-print-preview {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          display: block !important;
        }
        .invoice-print-preview.hidden {
          display: block !important;
          left: 0 !important;
          top: 0 !important;
        }
        .no-print {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    return () => {
      document.head.removeChild(printStyles);
    };
  }, []);

  const viewFullInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  // Filter invoiced sales based on filters
  const filteredInvoicedSales = invoices.filter(sale => {
    if (filters.amount && sale.finalTotal < parseFloat(filters.amount)) return false;
    if (filters.customerName && !sale.customerName.toLowerCase().includes(filters.customerName.toLowerCase())) return false;
    if (filters.paymentMethod && sale.paymentMethod !== filters.paymentMethod) return false;
    if (filters.startDate && sale.date < filters.startDate) return false;
    if (filters.endDate && sale.date > filters.endDate) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
      </div>

      {/* Tabs */}
      <div className="border-b border-green-200">
        <nav className="-mb-px flex space-x-8">
          <button
            data-no-loading="true"
            onClick={() => setActiveTab('generator')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'generator'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-green-300'
            }`}
          >
            INVOICE GENERATOR
          </button>
          <button
            data-no-loading="true"
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-green-300'
            }`}
          >
            ALL INVOICED SALES
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'generator' ? (
        <div className="space-y-6">
          {/* Form Section */}
        <div className="bg-white p-6 border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fill Invoice Details</h3>
            
            {/* Invoice Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          name="invoiceNumber"
                          value={invoiceData.invoiceNumber}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                          readOnly
                        />
            </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <DateInput name="date" value={invoiceData.date} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    value={invoiceData.customerName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter customer name"
                  />
              </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                        <input
                          type="text"
                          name="poNumber"
                          value={invoiceData.poNumber}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                          readOnly
                        />
                      </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <DateInput name="dueDate" value={invoiceData.dueDate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  name="paymentTerms"
                  value={invoiceData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Net 30"
                />
              </div>
                </div>

            {/* Items Form */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Items</h4>
              <div className="space-y-3">
                        {invoiceData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 items-center">
                              <input
                                type="text"
                                value={item.item}
                                onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Item name"
                              />
                              <input
                                type="number"
                                value={item.qty}
                                onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Quantity"
                              />
                              <input
                                type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Rate"
                    />
                    <div className="text-sm text-gray-600">
                      TZS {item.total ? parseFloat(item.total).toLocaleString() : '0.00'}
                    </div>
                  </div>
                ))}
                  <button
                    onClick={addItem}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                  <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </button>
              </div>
                </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  name="taxRate"
                  value={invoiceData.taxRate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping (TZS)</label>
                <input
                  type="number"
                  name="shipping"
                  value={invoiceData.shipping}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (TZS)</label>
                <input
                  type="number"
                  name="amountPaid"
                  value={invoiceData.amountPaid}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  min="0"
                />
                  </div>
                  </div>
                </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4 mt-8">
                    <button
                      onClick={() => {
                        setInvoiceData({
                          invoiceNumber: generateInvoiceNumber(),
                          date: new Date().toISOString().split('T')[0],
                          paymentTerms: '',
                          dueDate: '',
                          poNumber: generatePONumber(),
                          customerName: '',
                          customerEmail: '',
                          customerPhone: '',
                          customerAddress: '',
                          shipToName: '',
                          shipToAddress: '',
                          notes: '',
                          terms: '',
                          taxRate: 0,
                          shipping: 0,
                          amountPaid: 0,
                          items: [{ item: '', qty: '', unit: 'tray', price: '', total: 0 }]
                        });
                      }}
                      className="flex items-center px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Clear Form
                    </button>
            
            <div className="flex gap-4">
                  <button
                    onClick={generatePDF}
                    disabled={isLoading}
                    className={`flex items-center px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300 ${
                      isLoading 
                        ? 'loading-gradient text-white cursor-not-allowed' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate Invoice
                      </>
                    )}
                  </button>
                </div>
              </div>
        </div>
              ) : (
                <div className="bg-white border border-gray-300">
                  <div className="p-6">
                    {/* Filter Button */}
                    <div className="mb-6 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">All Invoiced Sales</h3>
                      <div className="relative">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                          </svg>
                          Filter
                        </button>
                        
                        {/* Filter Dropdown */}
                        {showFilters && (
                          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <div className="p-4">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-semibold text-gray-900">Filter Options</h4>
                                <button
                                  onClick={() => setShowFilters(false)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name</label>
                                  <input
                                    type="text"
                                    name="customerName"
                                    value={filters.customerName}
                                    onChange={handleFilterChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="Search by customer name"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Minimum Amount</label>
                                  <input
                                    type="number"
                                    name="amount"
                                    value={filters.amount}
                                    onChange={handleFilterChange}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="Filter by amount"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                    <DateInput name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                    <DateInput name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                  </div>
                                </div>
                                
                                <div className="flex justify-end space-x-2 pt-2">
                                  <button
                                    onClick={clearFilters}
                                    className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    onClick={() => setShowFilters(false)}
                                    className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  >
                                    Apply
                  </button>
                </div>
              </div>
            </div>
                          </div>
                        )}
          </div>
        </div>
                    
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                          {filteredInvoicedSales.length > 0 ? (
                            filteredInvoicedSales.map((sale) => (
                    <tr key={sale.id} className="cursor-pointer hover:bg-gray-50" onClick={() => viewFullInvoice(sale)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.invoiceNumber}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          TZS {sale.finalTotal?.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                      <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                        No invoices found. Generate your first invoice using the form above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-gray-500 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-2 border-b border-gray-300 bg-gray-100 no-print flex-shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-900">Invoice Preview</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      flushSync(() => setInvoiceData(selectedInvoice));
                      window.print();
                    }}
                    className="flex items-center px-2 py-1 bg-purple-600 text-white hover:bg-purple-700 text-xs border border-gray-700"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-2 py-1 bg-gray-600 text-white hover:bg-gray-700 text-xs border border-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white overflow-y-auto flex-1 no-print">
              <InvoicePrint
                companyName={companyInfo.companyName}
                logoUrl={companyInfo.logo}
                companyDetails={companyInfo}
                invoiceNumber={selectedInvoice.invoiceNumber}
                date={selectedInvoice.date}
                dueDate={selectedInvoice.dueDate}
                poNumber={selectedInvoice.poNumber}
                billTo={selectedInvoice.customerName}
                shipTo={selectedInvoice.shipToName || selectedInvoice.shipToAddress || selectedInvoice.customerName}
                items={selectedInvoice.items}
                taxRate={selectedInvoice.taxRate}
                shipping={selectedInvoice.shipping}
                subtotal={selectedInvoice.subtotal}
                tax={selectedInvoice.tax}
                total={selectedInvoice.finalTotal}
                balanceDue={
                  selectedInvoice.balanceDue != null
                    ? selectedInvoice.balanceDue
                    : (Number(selectedInvoice.finalTotal || 0) - Number(selectedInvoice.amountPaid || 0))
                }
                currencyLabel={String(selectedInvoice.currency || '').toUpperCase() === 'USD' ? 'USD' : 'TZS'}
                exchangeRate={String(selectedInvoice.currency || '').toUpperCase() === 'USD' ? selectedInvoice.usdRate : null}
                exchangeLabel="USD/TZS"
                convertedCurrencyLabel="TZS"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden Print Preview - Always rendered for printing */}
      <div className="invoice-print invoice-print-preview hidden" style={{position: 'absolute', left: '-9999px', top: '-9999px'}}>
        {invoiceData.invoiceNumber && (
          <InvoicePrint
            companyName={companyInfo.companyName}
            logoUrl={companyInfo.logo}
            companyDetails={companyInfo}
            invoiceNumber={invoiceData.invoiceNumber}
            date={invoiceData.date}
            dueDate={invoiceData.dueDate}
            poNumber={invoiceData.poNumber}
            billTo={invoiceData.customerName}
            shipTo={invoiceData.shipToName || invoiceData.shipToAddress || invoiceData.customerName}
            items={invoiceData.items}
            taxRate={invoiceData.taxRate}
            shipping={invoiceData.shipping}
            subtotal={invoiceData.subtotal ?? calculateTotal()}
            tax={invoiceData.tax ?? ((calculateTotal() * (Number(invoiceData.taxRate) || 0)) / 100)}
            total={invoiceData.finalTotal ?? (calculateTotal() + ((calculateTotal() * (Number(invoiceData.taxRate) || 0)) / 100) + (Number(invoiceData.shipping) || 0))}
            balanceDue={invoiceData.balanceDue ?? ((invoiceData.finalTotal ?? 0) - (Number(invoiceData.amountPaid) || 0))}
            currencyLabel={String(invoiceData.currency || '').toUpperCase() === 'USD' ? 'USD' : 'TZS'}
            exchangeRate={String(invoiceData.currency || '').toUpperCase() === 'USD' ? invoiceData.usdRate : null}
            exchangeLabel="USD/TZS"
            convertedCurrencyLabel="TZS"
          />
        )}
      </div>
    </div>
  );
};

export default Invoice;
