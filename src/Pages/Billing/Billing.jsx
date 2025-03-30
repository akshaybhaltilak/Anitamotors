import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";

const Invoice = () => {
  const invoiceRef = useRef();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [gstRate, setGstRate] = useState(5);
  const [grandTotal, setGrandTotal] = useState(0);
  const [cgstAmount, setCgstAmount] = useState(0);
  const [sgstAmount, setSgstAmount] = useState(0);
  const [totalBeforeGst, setTotalBeforeGst] = useState(0);
  const [showSavedInvoices, setShowSavedInvoices] = useState(false);
  const [savedInvoices, setSavedInvoices] = useState([]);

  // Fixed print handler to ensure proper printing
  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${invoiceNumber}`,
    onBeforeGetContent: () => {
      // Make sure everything is rendered properly
      return new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    },
    onAfterPrint: () => console.log("Printed successfully!"),
  });

  const [vehicleDetails, setVehicleDetails] = useState({
    motorNo: "",
    chassisNo: "",
    batteryNo: "",
    controllerNo: "",
  });

  const [customer, setCustomer] = useState({
    name: "",
    mobile: "",
    address: "",
  });

  const [items, setItems] = useState([
    { id: 1, particular: "", rate: "", qty: 1, hsn: "87116020", total: "" },
  ]);

  // Generate invoice number using the new format AM001, AM002, etc.
  useEffect(() => {
    // Set current date as default
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}/${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;
    setInvoiceDate(formattedDate);
    
    // Get counter from localStorage or set to 1
    let counter = parseInt(localStorage.getItem('invoiceCounter') || '0') + 1;
    localStorage.setItem('invoiceCounter', counter.toString());
    
    // Use the new format AM001, AM002, etc.
    setInvoiceNumber(`AM${counter.toString().padStart(3, '0')}`);
    
    // Load saved invoices from localStorage
    loadSavedInvoices();
  }, []);

  // Calculate totals whenever items change
  useEffect(() => {
    calculateTotals();
  }, [items, gstRate]);

  const handleChange = (e) => {
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  };

  const handleVehicleChange = (e) => {
    setVehicleDetails({ ...vehicleDetails, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Auto-calculate total for this item
    if (field === 'rate' || field === 'qty') {
      const rate = parseFloat(newItems[index].rate) || 0;
      const qty = parseFloat(newItems[index].qty) || 0;
      newItems[index].total = (rate * qty).toFixed(2);
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items, 
      {
        id: items.length + 1,
        particular: "",
        rate: "",
        qty: 1,
        hsn: "87116020", // Set default HSN code
        total: ""
      }
    ]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      // Reassign IDs
      newItems.forEach((item, i) => {
        item.id = i + 1;
      });
      setItems(newItems);
    }
  };

  const calculateTotals = () => {
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.total) || 0);
    }, 0);
    
    setTotalBeforeGst(totalAmount);
    
    const cgst = (totalAmount * (gstRate / 2) / 100);
    const sgst = (totalAmount * (gstRate / 2) / 100);
    
    setCgstAmount(cgst);
    setSgstAmount(sgst);
    setGrandTotal(totalAmount + cgst + sgst);
  };

  const saveInvoice = () => {
    const invoiceData = {
      invoiceNumber,
      invoiceDate,
      customer,
      vehicleDetails,
      items,
      totalBeforeGst,
      cgstAmount,
      sgstAmount,
      grandTotal,
      gstRate,
      timestamp: new Date().getTime()
    };
    
    // Get existing invoices from localStorage
    const savedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    
    // Add new invoice
    savedInvoices.push(invoiceData);
    
    // Save back to localStorage
    localStorage.setItem('invoices', JSON.stringify(savedInvoices));
    
    // Update state with new saved invoices
    setSavedInvoices(savedInvoices);
    
    alert('Invoice saved successfully!');
  };

  const loadSavedInvoices = () => {
    const savedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    setSavedInvoices(savedInvoices);
  };

  const loadInvoice = (invoice) => {
    setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(invoice.invoiceDate);
    setCustomer(invoice.customer);
    setVehicleDetails(invoice.vehicleDetails || {
      motorNo: "",
      chassisNo: "",
      batteryNo: "",
      controllerNo: "",
    });
    setItems(invoice.items);
    setGstRate(invoice.gstRate);
    setShowSavedInvoices(false);
  };

  const deleteInvoice = (index) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      const updatedInvoices = [...savedInvoices];
      updatedInvoices.splice(index, 1);
      localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
      setSavedInvoices(updatedInvoices);
    }
  };

  const resetForm = () => {
    if (window.confirm('Are you sure you want to reset the form? All data will be lost.')) {
      setCustomer({
        name: "",
        mobile: "",
        address: "",
      });
      setVehicleDetails({
        motorNo: "",
        chassisNo: "",
        batteryNo: "",
        controllerNo: "",
      });
      setItems([
        { id: 1, particular: "", rate: "", qty: 1, hsn: "87116020", total: "" },
      ]);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center">ANITA MOTORS - Invoice System</h1>
        </div>
        
        {/* Action Buttons */}
        <div className="bg-white p-4 shadow-md flex flex-wrap gap-2 justify-between mb-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Print Invoice
          </button>
          <button
            onClick={saveInvoice}
            className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm12 0H5v10h10V5z" clipRule="evenodd" />
            </svg>
            Save Invoice
          </button>
          <button
            onClick={() => setShowSavedInvoices(!showSavedInvoices)}
            className="px-4 py-2 bg-purple-600 text-white rounded shadow hover:bg-purple-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            {showSavedInvoices ? "Hide" : "Show"} Saved Invoices
          </button>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reset Form
          </button>
        </div>
        
        {/* Saved Invoices List */}
        {showSavedInvoices && (
          <div className="bg-white p-4 mb-4 shadow-md rounded-lg">
            <h2 className="text-xl font-bold mb-3 text-gray-800 border-b pb-2">Saved Invoices</h2>
            {savedInvoices.length === 0 ? (
              <p className="text-gray-600">No saved invoices found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-3 border text-left">Invoice No</th>
                      <th className="py-2 px-3 border text-left">Date</th>
                      <th className="py-2 px-3 border text-left">Customer</th>
                      <th className="py-2 px-3 border text-right">Amount</th>
                      <th className="py-2 px-3 border text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedInvoices.map((invoice, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border">{invoice.invoiceNumber}</td>
                        <td className="py-2 px-3 border">{invoice.invoiceDate}</td>
                        <td className="py-2 px-3 border">{invoice.customer.name || "N/A"}</td>
                        <td className="py-2 px-3 border text-right">₹{invoice.grandTotal.toFixed(2)}</td>
                        <td className="py-2 px-3 border text-center">
                          <button 
                            onClick={() => loadInvoice(invoice)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Load
                          </button>
                          <button 
                            onClick={() => deleteInvoice(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Invoice Form */}
        <div className="bg-white p-6 shadow-lg rounded-lg">
          <div className="mb-4 flex flex-wrap justify-between items-end gap-2">
            <div>
              <label className="block text-sm font-bold text-gray-700">Invoice Number:</label>
              <input 
                type="text" 
                value={invoiceNumber} 
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="border rounded px-3 py-2 mt-1 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">Date:</label>
              <input 
                type="text" 
                value={invoiceDate} 
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="border rounded px-3 py-2 mt-1 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700">GST Rate (%):</label>
              <select 
                value={gstRate} 
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="border rounded px-3 py-2 mt-1 w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2">2%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>
          
          {/* Printable invoice */}
          <div ref={invoiceRef} className="p-4 border rounded">
            <h2 className="text-xl font-bold text-center border-b pb-2">Tax Invoice</h2>
            <div className="mt-4 text-sm">
              <div className="flex flex-wrap justify-between">
                <div>
                  <p className="font-bold">ANITA MOTORS.</p>
                  <p>Shop No 2, Rahate Complex, Jawahar Nagar</p>
                  <p>Akola 444001</p>
                  <p>Contact: 8468857781</p>
                  <p>GSTIN: 27CSZPR0818J1ZX</p>
                </div>
                <div className="text-right">
                  <p>Invoice No: <span className="font-bold">{invoiceNumber}</span></p>
                  <p>Date: {invoiceDate}</p>
                </div>
              </div>
              
              {/* Customer Details */}
              <div className="border rounded my-4 p-3 bg-gray-50">
                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Name:</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={customer.name} 
                      onChange={handleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Customer Name" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Mobile No:</label>
                    <input 
                      type="text" 
                      name="mobile" 
                      value={customer.mobile} 
                      onChange={handleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Mobile Number" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block font-bold text-gray-700 text-sm">Address:</label>
                    <textarea 
                      name="address" 
                      value={customer.address} 
                      onChange={handleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Customer Address"
                      rows="2"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              {/* Vehicle Details */}
              <div className="border rounded my-4 p-3 bg-gray-50">
                <h3 className="font-bold text-gray-700 border-b pb-1 mb-2">Vehicle Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Motor No:</label>
                    <input 
                      type="text" 
                      name="motorNo" 
                      value={vehicleDetails.motorNo} 
                      onChange={handleVehicleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Motor Number" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Chassis No:</label>
                    <input 
                      type="text" 
                      name="chassisNo" 
                      value={vehicleDetails.chassisNo} 
                      onChange={handleVehicleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Chassis Number" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Battery No:</label>
                    <input 
                      type="text" 
                      name="batteryNo" 
                      value={vehicleDetails.batteryNo} 
                      onChange={handleVehicleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Battery Number" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 text-sm">Controller No:</label>
                    <input 
                      type="text" 
                      name="controllerNo" 
                      value={vehicleDetails.controllerNo} 
                      onChange={handleVehicleChange} 
                      className="w-full border rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="Controller Number" 
                    />
                  </div>
                </div>
              </div>
              
              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border px-2 py-2 text-center">SR NO</th>
                      <th className="border px-2 py-2 text-center">Particulars</th>
                      <th className="border px-2 py-2 text-center">HSN/SAC</th>
                      <th className="border px-2 py-2 text-center">Rate</th>
                      <th className="border px-2 py-2 text-center">QTY</th>
                      <th className="border px-2 py-2 text-center">Total</th>
                      <th className="border px-2 py-2 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border px-2 py-2 text-center">{item.id}</td>
                        <td className="border px-2 py-2">
                          <input 
                            type="text" 
                            value={item.particular} 
                            onChange={(e) => handleItemChange(index, 'particular', e.target.value)}
                            className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Item name/description"
                          />
                        </td>
                        <td className="border px-2 py-2">
                          <input 
                            type="text" 
                            value={item.hsn} 
                            onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                            className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            readOnly
                          />
                        </td>
                        <td className="border px-2 py-2">
                          <input 
                            type="number" 
                            value={item.rate} 
                            onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                            className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            placeholder="Price"
                          />
                        </td>
                        <td className="border px-2 py-2">
                          <input 
                            type="number" 
                            value={item.qty} 
                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                            className="w-full focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            min="1"
                          />
                        </td>
                        <td className="border px-2 py-2">
                          <input 
                            type="text" 
                            value={item.total} 
                            readOnly 
                            className="w-full bg-gray-100" 
                          />
                        </td>
                        <td className="border px-2 py-2 text-center print:hidden">
                          <button 
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Add Item Button */}
              <div className="mt-2 print:hidden">
                <button 
                  onClick={addItem}
                  className="flex items-center text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Item
                </button>
              </div>
              
              {/* GST and Total Calculations */}
              <div className="mt-6 bg-gray-50 p-3 rounded border">
                <div className="flex flex-wrap justify-between text-sm mb-2">
                  <div className="px-2 py-1">
                    <p><strong>CGST {gstRate/2}%:</strong> ₹{cgstAmount.toFixed(2)}</p>
                  </div>
                  <div className="px-2 py-1">
                    <p><strong>SGST {gstRate/2}%:</strong> ₹{sgstAmount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-between font-bold text-md border-t pt-2">
                  <div className="px-2 py-1">
                    <p>TOTAL: ₹{totalBeforeGst.toFixed(2)}</p>
                  </div>
                  <div className="px-2 py-1">
                    <p>GST {gstRate}%: ₹{(cgstAmount + sgstAmount).toFixed(2)}</p>
                  </div>
                  <div className="px-2 py-1 bg-blue-100 rounded">
                    <p>GRAND TOTAL: ₹{grandTotal.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {/* Signature Area */}
              <div className="mt-8 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <div className="w-1/3 border-t border-dashed border-gray-400 pt-1 text-center">
                    <p>Customer Signature</p>
                  </div>
                  <div className="w-1/3 border-t border-dashed border-gray-400 pt-1 text-center">
                    <p>FOR ANITA MOTORS</p>
                  </div>
                </div>
              </div>
              
              {/* Terms & Instructions */}
              <div className="mt-6 text-xs border-t pt-4">
                <p className="font-bold mb-1">Battery Care Instructions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Battery should not be overcharged, or warranty will be terminated.</li>
                  <li>Rotate all batteries every 3 months from your nearest dealer.</li>
                  <li>Keep batteries away from water. Do not wash batteries.</li>
                  <li>Do not accelerate or brake abruptly. Do not overload the scooter.</li>
                  <li>Once a month, fully discharge and fully charge the battery.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;