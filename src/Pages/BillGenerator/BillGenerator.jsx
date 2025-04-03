import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const BillGenerator = ({ vehicle, initialBillData, onCompleteSale, onCancel }) => {
    const [billData, setBillData] = useState({
        ...initialBillData,
        motorNo: '',
        chassisNo: '',
        batteryNo: '',
        controllerNo: '',
    });
    const [editMode, setEditMode] = useState(true);
    const [savedBills, setSavedBills] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCategory, setSearchCategory] = useState('customerName');
    const [showHistory, setShowHistory] = useState(false);

    const [billFormat, setBillFormat] = useState('normal'); // 'normal' or 'bajaj'

    // Add this function to toggle between bill formats
    const toggleBillFormat = (format) => {
        setBillFormat(format);
    };
    const billRef = useRef();

    // Load saved bills from localStorage on component mount
    useEffect(() => {
        try {
            const bills = JSON.parse(localStorage.getItem('savedBills') || '[]');
            setSavedBills(bills);
        } catch (error) {
            console.error('Error parsing saved bills from localStorage:', error);
            setSavedBills([]);
        }
    }, []);

    // Update bill data when initial data changes
    useEffect(() => {
        if (initialBillData) {
            setBillData(prev => ({
                ...prev,
                motorNo: initialBillData.motorNo || '',
                chassisNo: initialBillData.chassisNo || '',
                batteryNo: initialBillData.batteryNo || '',
                controllerNo: initialBillData.controllerNo || ''
            }));
        }
    }, [initialBillData]);

    // Generate next invoice number based on last saved bill
    useEffect(() => {
        if (savedBills.length > 0) {
            const lastInvoiceNumber = savedBills[savedBills.length - 1].billNumber;
            const match = lastInvoiceNumber.match(/AM(\d+)/);
            if (match) {
                const nextNumber = parseInt(match[1]) + 1;
                setBillData(prev => ({
                    ...prev,
                    billNumber: `AM${nextNumber.toString().padStart(4, '0')}`
                }));
            }
        } else {
            setBillData(prev => ({
                ...prev,
                billNumber: 'AM0001'
            }));
        }
    }, [savedBills]);

    // Calculate total amount and taxes
    const calculateAmounts = () => {
        const totalAmount = (billData.sellingPrice || 0) * (billData.quantity || 0);
        const cgst = totalAmount * 0.025; // 2.5% CGST
        const sgst = totalAmount * 0.025; // 2.5% SGST
        const totalTax = cgst + sgst;
        const finalAmount = totalAmount + totalTax;

        return {
            totalAmount,
            cgst,
            sgst,
            totalTax,
            finalAmount
        };
    };

    const { totalAmount, cgst, sgst, finalAmount } = calculateAmounts();

    // Convert number to words
    const numberToWords = (num) => {
        if (num === 0) return 'Zero Rupees Only';

        // Arrays for number names
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        // Function to convert numbers less than 1000
        const convertLessThanOneThousand = (num) => {
            if (num < 20) {
                return ones[num];
            }

            const ten = Math.floor(num / 10);
            const one = num % 10;

            return tens[ten] + (one !== 0 ? ' ' + ones[one] : '');
        };

        // Split number into rupees and paise
        let remaining = Math.floor(num); // Use a separate variable for remaining amount
        const paise = Math.round((num - remaining) * 100);

        // Convert rupees part
        let result = '';

        if (remaining >= 10000000) {
            const crore = Math.floor(remaining / 10000000);
            result += convertLessThanOneThousand(crore) + ' Crore ';
            remaining %= 10000000;
        }

        if (remaining >= 100000) {
            const lakh = Math.floor(remaining / 100000);
            result += convertLessThanOneThousand(lakh) + ' Lakh ';
            remaining %= 100000;
        }

        if (remaining >= 1000) {
            const thousand = Math.floor(remaining / 1000);
            result += convertLessThanOneThousand(thousand) + ' Thousand ';
            remaining %= 1000;
        }

        if (remaining >= 100) {
            const hundred = Math.floor(remaining / 100);
            result += convertLessThanOneThousand(hundred) + ' Hundred ';
            remaining %= 100;
        }

        if (remaining > 0) {
            result += convertLessThanOneThousand(remaining);
        }

        // Handle paise part
        if (paise > 0) {
            return result + ' Rupees and ' + convertLessThanOneThousand(paise) + ' Paise Only';
        } else {
            return result + ' Rupees Only';
        }
    };

    // Handle input changes for bill data
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBillData({
            ...billData,
            [name]: name === 'quantity' || name === 'sellingPrice'
                ? parseFloat(value) || 0
                : value
        });
    };

    // Handle print functionality
    const handlePrint = useReactToPrint({
        content: () => billRef.current,
        documentTitle: `Invoice-${billData.billNumber}`,
    });

    // Save bill as PDF to localStorage
    const saveBillToLocalStorage = (bill) => {
        const updatedBills = [...savedBills, bill];
        localStorage.setItem('savedBills', JSON.stringify(updatedBills));
        setSavedBills(updatedBills);
    };

    // Handle save and download
    const handleSave = () => {
        if (!billData.customerName.trim()) {
            alert('Customer name is required');
            return;
        }

        if (!billData.chassisNo.trim() || !billData.motorNo.trim()) {
            alert('Chassis and Motor numbers are required');
            return;
        }

        // Validate quantity
        if (billData.quantity <= 0 || billData.quantity > vehicle.quantity) {
            alert(`Invalid quantity. Available: ${vehicle.quantity}`);
            return;
        }

        const billToSave = {
            ...billData,
            vehicleDetails: vehicle,
            totalAmount,
            cgst,
            sgst,
            finalAmount,
            createdAt: new Date().toISOString()
        };

        saveBillToLocalStorage(billToSave);
        onCompleteSale(billToSave);

        // Automatically trigger print/download
        setTimeout(() => {
            handlePrint();
        }, 500);
    };

    // Search functionality
    const filteredBills = savedBills.filter(bill => {
        if (!searchTerm) return false;

        const searchValue = bill[searchCategory]?.toString().toLowerCase() || '';
        return searchValue.includes(searchTerm.toLowerCase());
    });

    // Delete a saved bill
    const handleDeleteBill = (billNumber) => {
        if (window.confirm('Are you sure you want to delete this bill?')) {
            const updatedBills = savedBills.filter(bill => bill.billNumber !== billNumber);
            localStorage.setItem('savedBills', JSON.stringify(updatedBills));
            setSavedBills(updatedBills);
        }
    };

    // Edit a saved bill
    const handleEditBill = (bill) => {
        setBillData(bill);
        setEditMode(true);
    };

    // Get next service date
    const getServiceDate = (months) => {
        const date = billData.date ? new Date(billData.date) : new Date();
        date.setMonth(date.getMonth() + months);
        return date.toLocaleDateString('en-IN');
    };

    // Generate PDF document for download
    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section */}
                <View style={styles.companySection}>
                    <View style={styles.companyDetails}>
                        <Text style={styles.companyName}>ANITA MOTORS</Text>
                        <Text style={styles.companyAddress}>
                            Shop no 2, Rahate complex, Jawahar Nagar,{"\n"}
                            Akola 444001, Maharashtra
                        </Text>
                        <Text style={styles.companyContact}>Contact: 8468857781 | Email: anitamotors@example.com</Text>
                        <Text style={styles.gst}>GSTIN: 27CSZPR0818J1ZX | State: Maharashtra (30)</Text>
                    </View>
                    <View style={styles.logoSection}>
                        {/* Logo would go here in actual implementation */}
                        {/* <Image style={styles.logo} src="/logo.png" /> */}
                    </View>
                </View>

                <Text style={styles.header}>TAX INVOICE</Text>

                {/* Invoice Info */}
                <View style={styles.invoiceInfo}>
                    <View style={styles.invoiceInfoColumn}>
                        <View style={styles.invoiceInfoRow}>
                            <Text style={styles.invoiceLabel}>Invoice No:</Text>
                            <Text style={styles.invoiceValue}>{billData.billNumber}</Text>
                        </View>
                        <View style={styles.invoiceInfoRow}>
                            <Text style={styles.invoiceLabel}>Date:</Text>
                            <Text style={styles.invoiceValue}>{new Date(billData.date).toLocaleDateString('en-IN')}</Text>
                        </View>
                        <View style={styles.invoiceInfoRow}>
                            <Text style={styles.invoiceLabel}>Mode:</Text>
                            <Text style={styles.invoiceValue}>{billData.paymentMode || 'Cash'}</Text>
                        </View>
                    </View>
                </View>

                {/* Customer & Vehicle Details */}
                <View style={styles.detailsSection}>
                    <View style={styles.detailsColumn}>
                        <Text style={styles.sectionTitle}>BILL TO:</Text>
                        <Text style={styles.customerName}>{billData.customerName}</Text>
                        <Text style={styles.detailText}>Contact: {billData.customerContact || '-'}</Text>
                        <Text style={styles.detailText}>Address: {billData.customerAddress || '-'}</Text>
                    </View>
                    <View style={styles.detailsColumn}>
                        <Text style={styles.sectionTitle}>VEHICLE DETAILS:</Text>
                        <Text style={styles.detailText}>
                            <Text style={styles.highlight}>{vehicle.name} {vehicle.model}</Text>
                        </Text>
                        <Text style={styles.detailText}>Color: {vehicle.color || 'N/A'}</Text>
                        <Text style={styles.detailText}>Motor No: {billData.motorNo}</Text>
                        <Text style={styles.detailText}>Chassis No: {billData.chassisNo}</Text>
                        {billData.batteryNo && <Text style={styles.detailText}>Battery No: {billData.batteryNo}</Text>}
                        {billData.controllerNo && <Text style={styles.detailText}>Controller No: {billData.controllerNo}</Text>}
                    </View>
                </View>

                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRowHeader}>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '5%' }]}>#</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '45%' }]}>DESCRIPTION</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '10%' }]}>HSN</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '15%' }]}>RATE </Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '10%' }]}>QTY</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '15%' }]}>AMOUNT</Text>
                    </View>

                    {/* Table Row */}
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '5%' }]}>1</Text>
                        <Text style={[styles.tableCell, { width: '45%' }]}>
                            {vehicle.name} {vehicle.model}
                        </Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>87116020</Text>
                        <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{billData.sellingPrice.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{billData.quantity}</Text>
                        <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{totalAmount.toFixed(2)}</Text>
                    </View>

                </View>

                {/* Amount Calculation */}
                <View style={styles.amountSection}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Subtotal:</Text>
                        <Text style={styles.amountValue}>rs {totalAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>CGST (2.5%):</Text>
                        <Text style={styles.amountValue}>rs {cgst.toFixed(2)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>SGST (2.5%):</Text>
                        <Text style={styles.amountValue}>rs {sgst.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.amountRow, styles.totalAmountRow]}>
                        <Text style={styles.totalAmountLabel}>TOTAL AMOUNT:</Text>
                        <Text style={styles.totalAmountValue}>rs {finalAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.amountInWords}>
                        <Text>Amount in Words: {numberToWords(finalAmount)}</Text>
                    </View>
                </View>

                {/* Terms & Conditions */}
                <View style={styles.termsSection}>
                    <Text style={styles.sectionTitle}>TERMS & CONDITIONS:</Text>
                    <View style={styles.termsColumns}>
                        <View style={styles.termsColumn}>
                            <Text style={styles.termItem}>• Battery: 8+4 months warranty</Text>
                            <Text style={styles.termItem}>• Motor & Controller: 1 year warranty</Text>
                            <Text style={styles.termItem}>• No warranty for charger</Text>
                            <Text style={styles.termItem}>• Goods once sold will not be taken back</Text>
                        </View>
                        <View style={styles.termsColumn}>
                            <Text style={styles.termItem}>• Avoid overcharging batteries</Text>
                            <Text style={styles.termItem}>• Get battery balanced every 3 months</Text>
                            <Text style={styles.termItem}>• Keep batteries away from water</Text>
                            <Text style={styles.termItem}>• Subject to Akola jurisdiction</Text>
                        </View>
                    </View>
                </View>

                {/* Service Schedule */}
                <View style={styles.serviceSection}>
                    <Text style={styles.sectionTitle}>SERVICE SCHEDULE:</Text>
                    <Text style={styles.serviceItem}>1. First free service: 500 KM or 2 months (<Text style={styles.highlight}>{getServiceDate(2)}</Text>)</Text>
                    <Text style={styles.serviceItem}>2. Second free service: 2000 KM or 4 months (<Text style={styles.highlight}>{getServiceDate(4)}</Text>)</Text>
                    <Text style={styles.serviceItem}>3. Third service: 4000 KM or 6 months (<Text style={styles.highlight}>{getServiceDate(6)}</Text>)</Text>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Customer Signature</Text>
                        <Text style={styles.signaturePlaceholder}>_________________________</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>For ANITA MOTORS</Text>
                        <Text style={styles.signaturePlaceholder}>_________________________</Text>
                        <Text style={styles.signatureNote}>Authorized Signatory</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Thank you for your business!</Text>
                    <View style={styles.divider} />
                    <Text style={styles.contactInfo}>ANITA MOTORS | 8468857781 | anitamotors@example.com</Text>
                    <Text style={styles.footerNote}>This is a computer generated invoice. No signature required.</Text>
                </View>
            </Page>
        </Document>
    );

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-blue-700">Vehicle Bill Generator</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                        {showHistory ? 'Hide History' : 'Show History'}
                    </button>
                    {!editMode && (
                        <PDFDownloadLink
                            document={<MyDocument />}
                            fileName={`Invoice_${billData.billNumber}.pdf`}
                            className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                        >
                            {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF')}
                        </PDFDownloadLink>
                    )}
                    <button
                        onClick={() => setEditMode(!editMode)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                    >
                        {editMode ? 'Preview' : 'Edit'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                        Print
                    </button>
                </div>
            </div>

            {/* Search Section */}
            {showHistory && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Bill History</h3>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex-grow">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search bills..."
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="w-48">
                            <select
                                value={searchCategory}
                                onChange={(e) => setSearchCategory(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="customerName">Customer Name</option>
                                <option value="chassisNo">Chassis Number</option>
                                <option value="motorNo">Motor Number</option>
                                <option value="batteryNo">Battery Number</option>
                                <option value="controllerNo">Controller Number</option>
                                <option value="date">Bill Date</option>
                                <option value="billNumber">Invoice Number</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border">Invoice #</th>
                                    <th className="p-2 border">Date</th>
                                    <th className="p-2 border">Customer</th>
                                    <th className="p-2 border">Vehicle</th>
                                    <th className="p-2 border">Chassis No</th>
                                    <th className="p-2 border">Amount</th>
                                    <th className="p-2 border">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(searchTerm ? filteredBills : savedBills).map((bill) => (
                                    <tr key={bill.billNumber} className="hover:bg-gray-50">
                                        <td className="p-2 border">{bill.billNumber}</td>
                                        <td className="p-2 border">{new Date(bill.date).toLocaleDateString()}</td>
                                        <td className="p-2 border">{bill.customerName}</td>
                                        <td className="p-2 border">{bill.vehicleDetails?.name || 'Vehicle'}</td>
                                        <td className="p-2 border">{bill.chassisNo}</td>
                                        <td className="p-2 border">₹{bill.finalAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                        <td className="p-2 border flex gap-1">
                                            <button
                                                onClick={() => handleEditBill(bill)}
                                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBill(bill.billNumber)}
                                                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setBillData(bill);
                                                    setEditMode(false);
                                                }}
                                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                                title="View"
                                            >
                                                👁️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 mb-2">Invoice Number*</label>
                        <input
                            type="text"
                            name="billNumber"
                            value={billData.billNumber}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Bill Date*</label>
                        <input
                            type="date"
                            name="date"
                            value={billData.date}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Customer Name*</label>
                        <input
                            type="text"
                            name="customerName"
                            value={billData.customerName}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Customer Contact</label>
                        <input
                            type="text"
                            name="customerContact"
                            value={billData.customerContact}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Customer Address</label>
                        <textarea
                            name="customerAddress"
                            value={billData.customerAddress || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="2"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Quantity*</label>
                        <input
                            type="number"
                            name="quantity"
                            value={billData.quantity}
                            onChange={handleInputChange}
                            min="1"
                            max={vehicle.quantity}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Selling Price (₹)*</label>
                        <input
                            type="number"
                            name="sellingPrice"
                            value={billData.sellingPrice}
                            onChange={handleInputChange}
                            min="1"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Motor Number*</label>
                        <input
                            type="text"
                            name="motorNo"
                            value={billData.motorNo}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Chassis Number*</label>
                        <input
                            type="text"
                            name="chassisNo"
                            value={billData.chassisNo}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Battery Number</label>
                        <input
                            type="text"
                            name="batteryNo"
                            value={billData.batteryNo}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 mb-2">Controller Number</label>
                        <input
                            type="text"
                            name="controllerNo"
                            value={billData.controllerNo}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            ) : (
                <div ref={billRef} className="p-4 border border-gray-200 rounded-lg bg-white">
                    {/* Bill Header - Based on the provided PDF format */}
                    <div className="border-b-2 border-blue-700 pb-4 mb-4">
                        <div className="text-center mb-4">
                            <h1 className="text-2xl font-bold">Tax Invoice</h1>
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold">ANITA MOTORS</h2>
                                <p className="text-sm">Shop no 2, Rahate complex, Jawahar Nagar,</p>
                                <p className="text-sm">Akola 444001. Contact: - 8468857781</p>
                                <p className="text-sm">GSTIN NO=27CSZPR0818J1ZX</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm"><strong>Invoice no:</strong> {billData.billNumber}</p>
                                <p className="text-sm"><strong>Date:</strong> {new Date(billData.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6 border-b pb-2">
                        <div className="flex justify-between">
                            <div>
                                <p><strong>CONSIGNEE:</strong> {billData.customerName}</p>
                                <p><strong>MOB NO:</strong> {billData.customerContact || '-'}</p>
                                <p><strong>Address:</strong> {billData.customerAddress || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Info */}
                    <div className="mb-6">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border text-center">SR NO</th>
                                    <th className="p-2 border text-left">Particulars</th>
                                    <th className="p-2 border text-right">RATE</th>
                                    <th className="p-2 border text-center">QTY</th>
                                    <th className="p-2 border text-center">HSN/SAC</th>
                                    <th className="p-2 border text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border text-center">01</td>
                                    <td className="p-2 border">
                                        <div>
                                            <p className="font-medium">{vehicle.name || "Electric Vehicle"}</p>
                                            <p className="text-sm text-gray-600">Model: {vehicle.model || "-"}</p>
                                            {vehicle.engineCapacity && <p className="text-sm text-gray-600">Engine: {vehicle.engineCapacity}</p>}
                                        </div>
                                    </td>
                                    <td className="p-2 border text-right">₹{billData.sellingPrice.toLocaleString()}</td>
                                    <td className="p-2 border text-center">{billData.quantity}</td>
                                    <td className="p-2 border text-center">87116020</td>
                                    <td className="p-2 border text-right">₹{totalAmount.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border text-center">02</td>
                                    <td className="p-2 border"><strong>MOTOR NO</strong></td>
                                    <td colSpan="4" className="p-2 border">{billData.motorNo}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border text-center">03</td>
                                    <td className="p-2 border"><strong>CHASSIS NO</strong></td>
                                    <td colSpan="4" className="p-2 border">{billData.chassisNo}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border text-center">04</td>
                                    <td className="p-2 border"><strong>BATTERY NO</strong></td>
                                    <td colSpan="4" className="p-2 border">{billData.batteryNo || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border text-center">05</td>
                                    <td className="p-2 border"><strong>CONTROLLER NO</strong></td>
                                    <td colSpan="4" className="p-2 border">{billData.controllerNo || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Tax Summary */}
                    <div className="mb-4 grid grid-cols-2">
                        <div>
                            <p><strong>• CGST 2.5% :</strong> ₹{cgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            <p><strong>• SGST 2.5% :</strong> ₹{sgst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            <p className="mt-2"><strong>IN WORDS :</strong> {numberToWords(finalAmount)}</p>
                        </div>
                        <div className="border-2 border-gray-300 p-2">
                            <div className="flex justify-between border-b pb-1">
                                <strong>TOTAL</strong>
                                <span>₹{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between border-b py-1">
                                <strong>GST 5%</strong>
                                <span>₹{(cgst + sgst).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between pt-1 font-bold">
                                <strong>GRAND TOTAL</strong>
                                <span>₹{finalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between mt-8 mb-4">
                        <div className="w-1/3 border-t pt-1 text-center">
                            <p>CUSTOMER SIGNATURE</p>
                        </div>
                        <div className="w-1/3 border-t pt-1 text-center">
                            <p>FOR ANITA MOTORS</p>
                            <p className="mt-6">Proprietor</p>
                        </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="mt-8 text-xs border-t pt-2">
                        <p className="font-semibold">Battery Usage Guidelines:</p>
                        <ul className="pl-4 list-disc text-xs">
                            <li>Battery should not be over charged, if it is seen that the battery is bulging then the warranty will be terminated.</li>
                            <li>Get all the batteries balanced by rotating in every 3 months from your nearest dealer.</li>
                            <li>Keep the batteries away from water. Do not wash batteries. Batteries are sealed do not attempt to add acid.</li>
                            <li>Do not accelerate and brake abruptly. Do not over load the scooter. Keep batteries cool. Charge under shade.</li>
                            <li>Once a month, Discharge battery fully and Charge battery fully. Charge after at-least 30 minutes of a long drive.</li>
                        </ul>
                    </div>

                    {/* Service Schedule */}
                    <div className="mt-4 text-xs border p-2 bg-gray-50">
                        <p className="font-semibold text-center mb-2">FOR SERVICE RELATED ISSUE CALL 8468857781</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            <p>1:- FIRST free SERVICE 500 KM OR 2 MONTHS WHICHEVER COMES FIRST {getServiceDate(2)}</p>
                            <p>2:- SECOND free SERVICE 2000KM OR 4 MONTHS WHICHEVER COMES FIRST {getServiceDate(4)}</p>
                            <p>3:- Third Paid SERVICE 4000 KM OR 6 MONTHS WHICHEVER COMES FIRST {getServiceDate(6)}</p>
                            <p>4:- Fourth Paid SERVICE 6000 KM OR 8 MONTHS WHICHEVER COMES FIRST {getServiceDate(8)}</p>
                            <p>5:- FIFTH Paid SERVICE 8000 KM OR 10 MONTHS WHICHEVER COMES FIRST {getServiceDate(10)}</p>
                        </div>
                    </div>

                    {/* Warranty Terms */}
                    <div className="mt-2 text-xs">
                        <ul className="pl-2">
                            <li>➢ BATTERY 8+4 GUARANTEE/WARRANTY.</li>
                            <li>➢ CONTROLLER AND MOTOR COMPLETE 1 YEAR GUARANTEE.</li>
                            <li>➢ NO CHARGER GUARANTEE/ WARRANTY.</li>
                            <li>➢ NO BULGING WARRANTY FOR BATTERY.</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                    Cancel
                </button>
                {!editMode && (
                    <PDFDownloadLink
                        document={<MyDocument />}
                        fileName={`Invoice_${billData.billNumber}.pdf`}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                        {({ loading }) => (loading ? 'Preparing PDF...' : 'Download PDF')}
                    </PDFDownloadLink>
                )}
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Complete Sale & Save
                </button>
            </div>
        </div>
    );
};

// PDF styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
        color: '#333333'
    },
    header: {
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: 'bold',
        color: '#1a5276',
        textTransform: 'uppercase',
        letterSpacing: 2
    },
    companySection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
        borderBottom: 2,
        borderBottomColor: '#1a5276',
        paddingBottom: 15
    },
    companyDetails: {
        width: '65%'
    },
    logoSection: {
        width: '35%',
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    logo: {
        width: 120,
        height: 60
    },
    companyName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1a5276'
    },
    companyAddress: {
        fontSize: 11,
        marginBottom: 4,
        color: '#555555',
        lineHeight: 1.4
    },
    companyContact: {
        fontSize: 11,
        marginBottom: 4,
        color: '#555555'
    },
    gst: {
        fontSize: 11,
        marginTop: 6,
        color: '#1a5276',
        fontWeight: 'bold'
    },
    invoiceInfo: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 25,
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        borderLeft: 4,
        borderLeftColor: '#1a5276'
    },
    invoiceInfoColumn: {
        width: '30%'
    },
    invoiceInfoRow: {
        flexDirection: 'row',
        marginBottom: 5
    },
    invoiceLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1a5276',
        width: '40%'
    },
    invoiceValue: {
        fontSize: 12,
        width: '60%'
    },
    detailsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25
    },
    detailsColumn: {
        width: '48%',
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8
    },
    sectionTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
        fontSize: 14,
        color: '#1a5276',
        borderBottom: 1,
        borderBottomColor: '#dddddd',
        paddingBottom: 6
    },
    customerName: {
        fontWeight: 'bold',
        marginBottom: 6,
        fontSize: 13,
        color: '#333333'
    },
    detailText: {
        fontSize: 11,
        marginBottom: 5,
        color: '#555555',
        lineHeight: 1.4
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#dddddd',
        marginBottom: 25,
        borderRadius: 8,
        overflow: 'hidden'
    },
    tableRowHeader: {
        flexDirection: 'row',
        backgroundColor: '#1a5276',
        color: '#ffffff'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        backgroundColor: '#ffffff',
        minHeight: 35,
        alignItems: 'center'
    },
    tableRowEven: {
        backgroundColor: '#f8f9fa'
    },
    tableCell: {
        padding: 10,
        fontSize: 11,
        justifyContent: 'center'
    },
    headerCell: {
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#ffffff',
        padding: 12,
        fontSize: 12
    },
    amountSection: {
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#dddddd',
        padding: 18,
        borderRadius: 8,
        backgroundColor: '#f8f9fa'
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
        paddingHorizontal: 10
    },
    amountLabel: {
        width: '30%',
        textAlign: 'right',
        paddingRight: 15,
        fontSize: 12,
        color: '#555555'
    },
    amountValue: {
        width: '20%',
        textAlign: 'right',
        fontSize: 12,
        color: '#333333'
    },
    totalAmountRow: {
        borderTopWidth: 1,
        borderTopColor: '#dddddd',
        paddingTop: 10,
        marginTop: 10,
        backgroundColor: '#e8f4f8',
        padding: 10,
        borderRadius: 5
    },
    totalAmountLabel: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1a5276'
    },
    totalAmountValue: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#1a5276'
    },
    amountInWords: {
        marginTop: 15,
        fontStyle: 'italic',
        fontSize: 11,
        color: '#555555',
        backgroundColor: '#e8f4f8',
        padding: 10,
        borderRadius: 5,
        borderLeft: 3,
        borderLeftColor: '#1a5276'
    },
    termsSection: {
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#dddddd',
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#f8f9fa'
    },
    termsTitle: {
        fontWeight: 'bold',
        marginBottom: 10,
        fontSize: 14,
        color: '#1a5276'
    },
    termsColumns: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    termsColumn: {
        width: '48%'
    },
    termItem: {
        fontSize: 10,
        marginBottom: 6,
        color: '#555555',
        paddingLeft: 10,
        position: 'relative',
        lineHeight: 1.4
    },
    serviceSection: {
        marginBottom: 25,
        padding: 15,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dddddd'
    },
    serviceItem: {
        fontSize: 10,
        marginBottom: 5,
        color: '#555555',
        lineHeight: 1.4
    },
    highlight: {
        color: '#1a5276',
        fontWeight: 'bold'
    },
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
        marginBottom: 20
    },
    signatureBox: {
        width: '40%',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#dddddd',
        paddingTop: 10
    },
    signatureLabel: {
        fontWeight: 'bold',
        marginBottom: 5,
        fontSize: 12,
        color: '#1a5276'
    },
    signaturePlaceholder: {
        marginBottom: 5,
        height: 40
    },
    signatureNote: {
        fontSize: 9,
        textAlign: 'center',
        color: '#777777'
    },
    footer: {
        marginTop: 30,
        textAlign: 'center',
        fontSize: 10,
        color: '#1a5276',
        borderTopWidth: 2,
        borderTopColor: '#1a5276',
        paddingTop: 15
    },
    footerText: {
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#1a5276',
        marginBottom: 5,
        fontSize: 12
    },
    footerNote: {
        textAlign: 'center',
        fontSize: 9,
        fontStyle: 'italic',
        color: '#777777',
        marginTop: 5
    },
    contactInfo: {
        textAlign: 'center',
        fontSize: 9,
        marginTop: 8,
        color: '#555555'
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        marginVertical: 10
    }
});

export default BillGenerator;