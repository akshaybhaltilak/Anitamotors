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
    const [hsnNumber, setHsnNumber] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchCategory, setSearchCategory] = useState('customerName');
    const [showHistory, setShowHistory] = useState(false);
    const [billFormat, setBillFormat] = useState('standard'); // 'standard' or 'bajaj'

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

    const calculateAmounts = () => {
        const grossPriceWithGST = (billData.sellingPrice || 0) * (billData.quantity || 0);
        const gstRate = 0.05;
        const basePrice = grossPriceWithGST / (1 + gstRate);
        const totalTax = grossPriceWithGST - basePrice;
        const cgst = totalTax / 2;
        const sgst = totalTax / 2;

        return {
            basePrice,
            cgst,
            sgst,
            totalTax,
            finalAmount: grossPriceWithGST
        };
    };

    const { basePrice, cgst, sgst, finalAmount } = calculateAmounts();

    const numberToWords = (num) => {
        if (num === 0) return 'Zero Rupees Only';

        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        const convertLessThanOneThousand = (num) => {
            if (num < 20) {
                return ones[num];
            }

            const ten = Math.floor(num / 10);
            const one = num % 10;

            return tens[ten] + (one !== 0 ? ' ' + ones[one] : '');
        };

        let remaining = Math.floor(num);
        const paise = Math.round((num - remaining) * 100);

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

        if (paise > 0) {
            return result + ' Rupees and ' + convertLessThanOneThousand(paise) + ' Paise Only';
        } else {
            return result + ' Rupees Only';
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setBillData({
            ...billData,
            [name]: name === 'quantity' || name === 'sellingPrice'
                ? parseFloat(value) || 0
                : value
        });
    };

    const handlePrint = useReactToPrint({
        content: () => billRef.current,
        documentTitle: `Invoice-${billData.billNumber}`,
    });

    const saveBillToLocalStorage = (bill) => {
        const updatedBills = [...savedBills, bill];
        localStorage.setItem('savedBills', JSON.stringify(updatedBills));
        setSavedBills(updatedBills);
    };

    const handleSaveAndPrint = () => {
        if (!billData.customerName.trim()) {
            alert('Customer name is required');
            return;
        }

        if (!billData.chassisNo.trim() || !billData.motorNo.trim()) {
            alert('Chassis and Motor numbers are required');
            return;
        }

        if (billData.quantity <= 0 || billData.quantity > vehicle.quantity) {
            alert(`Invalid quantity. Available: ${vehicle.quantity}`);
            return;
        }

        const billToSave = {
            ...billData,
            vehicleDetails: vehicle,
            basePrice,
            cgst,
            sgst,
            finalAmount,
            hsnNumber,
            createdAt: new Date().toISOString()
        };

        saveBillToLocalStorage(billToSave);
        onCompleteSale(billToSave);

        setEditMode(false);

        setTimeout(() => {
            handlePrint();
        }, 500);
    };

    const filteredBills = savedBills.filter(bill => {
        if (!searchTerm) return false;
        const searchValue = bill[searchCategory]?.toString().toLowerCase() || '';
        return searchValue.includes(searchTerm.toLowerCase());
    });

    const handleDeleteBill = (billNumber) => {
        if (window.confirm('Are you sure you want to delete this bill?')) {
            const updatedBills = savedBills.filter(bill => bill.billNumber !== billNumber);
            localStorage.setItem('savedBills', JSON.stringify(updatedBills));
            setSavedBills(updatedBills);
        }
    };

    const handleEditBill = (bill) => {
        setBillData(bill);
        setHsnNumber(bill.hsnNumber || '');
        setEditMode(true);
    };

    const getServiceDate = (months) => {
        const date = billData.date ? new Date(billData.date) : new Date();
        date.setMonth(date.getMonth() + months);
        return date.toLocaleDateString('en-IN');
    };

    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section with Logo and Company Info */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerLeft}>
                            <Text style={styles.companyName}>ANITA MOTORS</Text>
                            <Text style={styles.companyAddress}>
                                Shop no 2, Rahate complex, Jawahar Nagar,{"\n"}
                                Akola 444001, Maharashtra
                            </Text>
                            <Text style={styles.companyContact}>Contact: 8468857781 | Email: anitamotors@example.com</Text>
                            <Text style={styles.gstInfo}>GSTIN: 27CSZPR0818J1ZX | State: Maharashtra (30)</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={styles.logoBox}>
                                <img
                                    src="https://media.istockphoto.com/id/814423752/photo/eye-of-model-with-colorful-art-make-up-close-up.jpg?s=612x612&w=0&k=20&c=l15OdMWjgCKycMMShP8UK94ELVlEGvt7GmB_esHWPYE="
                                    alt="Company Logo"
                                    style={{ width: '100%', height: 'auto' }}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tax Invoice Title */}
                <View style={styles.titleContainer}>
                    <View style={styles.titleLine}></View>
                    <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
                    <View style={styles.titleLine}></View>
                </View>

                {/* Invoice Info and Customer Details in a row */}
                <View style={styles.infoRow}>
                    {/* Invoice Details */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Invoice No:</Text>
                            <Text style={styles.infoValue}>{billData.billNumber || 'AM0003'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Date:</Text>
                            <Text style={styles.infoValue}>{new Date(billData.date).toLocaleDateString('en-IN') || '5/4/2025'}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Mode:</Text>
                            <Text style={styles.infoValue}>{billData.paymentMode || 'Cash'}</Text>
                        </View>
                    </View>

                    {/* Customer Details */}
                    <View style={styles.customerSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>BILL TO:</Text>
                        </View>
                        <View style={styles.sectionContent}>
                            <Text style={styles.customerName}>{billData.customerName || 'Akshay Bhaltilak'}</Text>
                            <Text style={styles.detailText}>Contact: {billData.customerContact || '243214'}</Text>
                            <Text style={styles.detailText}>Address: {billData.customerAddress || 'Akola, Maharashtra, Kanheri sarap Akola'}</Text>
                        </View>
                    </View>
                </View>

                {/* Vehicle Details Section */}
                <View style={styles.vehicleSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>VEHICLE DETAILS:</Text>
                    </View>
                    <View style={styles.vehicleDetailsGrid}>
                        <View style={styles.vehicleNameRow}>
                            <Text style={styles.vehicleName}>
                                {vehicle.name} {vehicle.model}
                            </Text>
                            {/* <Text style={styles.vehicleColor}>Color: {vehicle.color || 'N/A'}</Text> */}
                        </View>
                        <View style={styles.vehicleDetailsRow}>
                            <View style={styles.vehicleDetailItem}>
                                <Text style={styles.vehicleDetailLabel}>Motor No:</Text>
                                <Text style={styles.vehicleDetailValue}>{billData.motorNo || '-'}</Text>
                            </View>
                            <View style={styles.vehicleDetailItem}>
                                <Text style={styles.vehicleDetailLabel}>Chassis No:</Text>
                                <Text style={styles.vehicleDetailValue}>{billData.chassisNo || '-'}</Text>
                            </View>
                        </View>
                        <View style={styles.vehicleDetailsRow}>
                            <View style={styles.vehicleDetailItem}>
                                <Text style={styles.vehicleDetailLabel}>Battery No:</Text>
                                <Text style={styles.vehicleDetailValue}>{billData.batteryNo || '-'}</Text>
                            </View>
                            <View style={styles.vehicleDetailItem}>
                                <Text style={styles.vehicleDetailLabel}>Controller No:</Text>
                                <Text style={styles.vehicleDetailValue}>{billData.controllerNo || '-'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Product Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, styles.serialNoCell]}>#</Text>
                        <Text style={[styles.tableHeaderCell, styles.descriptionCell]}>DESCRIPTION</Text>
                        <Text style={[styles.tableHeaderCell, styles.hsnCell]}>HSN</Text>
                        <Text style={[styles.tableHeaderCell, styles.rateCell]}>RATE</Text>
                        <Text style={[styles.tableHeaderCell, styles.qtyCell]}>QTY</Text>
                        <Text style={[styles.tableHeaderCell, styles.amountCell]}>AMOUNT</Text>
                    </View>

                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.serialNoCell]}>1</Text>
                        <Text style={[styles.tableCell, styles.descriptionCell]}>
                            {vehicle.name} {vehicle.model}
                        </Text>
                        <Text style={[styles.tableCell, styles.hsnCell]}>{hsnNumber || '87141090'}</Text>
                        <Text style={[styles.tableCell, styles.rateCell]}>
                            {((basePrice || 50000) / (billData.quantity || 1)).toFixed(2)}
                        </Text>
                        <Text style={[styles.tableCell, styles.qtyCell]}>
                            {billData.quantity || 1}
                        </Text>
                        <Text style={[styles.tableCell, styles.amountCell]}>
                            {(basePrice || 50000).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Amount Calculation with Word Amount */}
                <View style={styles.calculationContainer}>
                    <View style={styles.calculationSection}>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>Subtotal:</Text>
                            <Text style={styles.calcValue}>₹ {(basePrice || 50000).toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>CGST (2.5%):</Text>
                            <Text style={styles.calcValue}>₹ {(cgst || 1250).toFixed(2)}</Text>
                        </View>
                        <View style={styles.calcRow}>
                            <Text style={styles.calcLabel}>SGST (2.5%):</Text>
                            <Text style={styles.calcValue}>₹ {(sgst || 1250).toFixed(2)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL AMOUNT:</Text>
                            <Text style={styles.totalValue}>₹ {(finalAmount || 52500).toFixed(2)}</Text>
                        </View>
                    </View>
                    <View style={styles.amountInWords}>
                        <Text style={styles.amountWordsText}>Amount in Words: {numberToWords(finalAmount || 52500)}</Text>
                    </View>
                </View>

                {/* signatureSection */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine}></View>
                        <Text style={styles.signatureLabel}>Customer Signature</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <View style={styles.signatureLine}></View>
                        <Text style={styles.signatureLabel}>For ANITA MOTORS</Text>
                        <Text style={styles.signatureTitle}>Authorized Signatory</Text>
                    </View>
                </View>

                {/* Terms and Service Schedule in Columns */}
                <View style={styles.infoColumns}>
                    {/* Terms & Conditions */}
                    <View style={styles.termsContainer}>
                        <View style={styles.boxHeader}>
                            <Text style={styles.boxTitle}>TERMS & CONDITIONS:</Text>
                        </View>
                        <View style={styles.termsContent}>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>Battery: 8+4 GUARANTEE warranty</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>Motor & Controller: 1 year warranty</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>No warranty for charger</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>NO BULGING WARRANTY For All BATTERY</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>Avoid overcharging batteries</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>Get battery balanced every 3 months</Text>
                            </View>
                            <View style={styles.termItem}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.termText}>Keep batteries away from water</Text>
                            </View>
                        </View>
                    </View>

                    {/* Service Schedule */}
                    <View style={styles.serviceContainer}>
                        <View style={styles.boxHeader}>
                            <Text style={styles.boxTitle}>SERVICE SCHEDULE:</Text>
                        </View>
                        <View style={styles.serviceContent}>
                            <View style={styles.serviceItem}>
                                <Text style={styles.serviceNumber}>1.</Text>
                                <Text style={styles.serviceText}>First free service: 500 KM or 2 months (<Text style={styles.highlight}>{getServiceDate(2)}</Text>)</Text>
                            </View>
                            <View style={styles.serviceItem}>
                                <Text style={styles.serviceNumber}>2.</Text>
                                <Text style={styles.serviceText}>Second free service: 2000 KM or 4 months (<Text style={styles.highlight}>{getServiceDate(4)}</Text>)</Text>
                            </View>
                            <View style={styles.serviceItem}>
                                <Text style={styles.serviceNumber}>3.</Text>
                                <Text style={styles.serviceText}>Third service: 4000 KM or 6 months (<Text style={styles.highlight}>{getServiceDate(6)}</Text>)</Text>
                            </View>
                            <View style={styles.serviceItem}>
                                <Text style={styles.serviceNumber}>4.</Text>
                                <Text style={styles.serviceText}>Fourth Paid SERVICE 6000 KM OR 8 MONTHS (<Text style={styles.highlight}>{getServiceDate(8)}</Text>)</Text>
                            </View>
                            <View style={styles.serviceItem}>
                                <Text style={styles.serviceNumber}>5.</Text>
                                <Text style={styles.serviceText}>FIFTH Paid SERVICE 8000 KM OR 10 MONTHS (<Text style={styles.highlight}>{getServiceDate(10)}</Text>)</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Battery Care Advice */}
                <View style={styles.batteryAdvice}>
                    <Text style={styles.adviceText}>Do not accelerate and brake abruptly. Do not over load the scooter. Keep batteries cool. Charge under shade. Once a month, Discharge battery fully and Charge battery fully. Charge after at-least 30 minutes of a long drive.</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Thank you for your business!</Text>
                    <View style={styles.footerDivider}></View>
                    <Text style={styles.footerContact}>ANITA MOTORS | 8468857781 | anitamotors@example.com</Text>
                    <Text style={styles.footerNote}>This is a computer generated invoice. No signature required.</Text>
                </View>
            </Page>
        </Document>
    );
    // Bajaj PDF Document
    const BajajDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Bajaj-specific header */}
                <View style={styles.companySection}>
                    <View style={styles.companyDetails}>
                        <Text style={styles.companyName}>ANITA MOTORS (BAJAJ DEALER)</Text>
                        <Text style={styles.companyAddress}>
                            Shop no 2, Rahate complex, Jawahar Nagar,{"\n"}
                            Akola 444001, Maharashtra
                        </Text>
                        <Text style={styles.companyContact}>Contact: 8468857781 | Email: anitamotors@example.com</Text>
                        <Text style={styles.gst}>GSTIN: 27CSZPR0818J1ZX | State: Maharashtra (30)</Text>
                    </View>
                </View>

                <Text style={styles.header}>BAJAJ VEHICLE INVOICE</Text>

                {/* Invoice Info - Bajaj style */}
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
                    </View>
                </View>

                {/* Customer Details - Bajaj style */}
                <View style={styles.detailsSection}>
                    <View style={styles.detailsColumn}>
                        <Text style={styles.sectionTitle}>CUSTOMER DETAILS:</Text>
                        <Text style={styles.customerName}>{billData.customerName}</Text>
                        <Text style={styles.detailText}>Contact: {billData.customerContact || '-'}</Text>
                        <Text style={styles.detailText}>Address: {billData.customerAddress || '-'}</Text>
                    </View>
                </View>

                {/* Vehicle Details - Bajaj style */}
                <View style={styles.detailsSection}>
                    <View style={styles.detailsColumn}>
                        <Text style={styles.sectionTitle}>VEHICLE DETAILS:</Text>
                        <Text style={styles.detailText}>
                            <Text style={styles.highlight}>{vehicle.name} {vehicle.model}</Text>
                        </Text>
                        <Text style={styles.detailText}>Color: {vehicle.color || 'N/A'}</Text>
                        <Text style={styles.detailText}>Variant: {vehicle.variant || 'Standard'}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    {/* Table Header */}
                    <View style={styles.tableRowHeader}>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '5%' }]}>#</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '50%' }]}>DESCRIPTION</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '10%' }]}>HSN</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '15%' }]}>RATE </Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '10%' }]}>QTY</Text>
                        <Text style={[styles.tableCell, styles.headerCell, { width: '10%' }]}>AMOUNT</Text>
                    </View>

                    {/* Table Row */}
                    <View style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '5%' }]}>1</Text>
                        <Text style={[styles.tableCell, { width: '50%' }]}>
                            {vehicle.name} {vehicle.model}
                        </Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>{hsnNumber}</Text>
                        <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{(basePrice / billData.quantity).toFixed(2)}</Text>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{billData.quantity}</Text>
                        <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' }]}>{basePrice.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Pricing Details - Bajaj style */}
                <View style={styles.amountSection}>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountLabel}>Ex-Showroom Price:</Text>
                        <Text style={styles.amountValue}>rs {basePrice.toFixed(2)}</Text>
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
                        <Text style={styles.totalAmountLabel}>ON-ROAD PRICE:</Text>
                        <Text style={styles.totalAmountValue}>rs {finalAmount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.amountInWords}>
                        <Text>Amount in Words: {numberToWords(finalAmount)}</Text>
                    </View>
                </View>

                {/* Bajaj-specific terms */}
                <View style={styles.termsSection}>
                    <Text style={styles.sectionTitle}>BAJAJ TERMS & CONDITIONS:</Text>
                    <View style={styles.termsColumns}>
                        <View style={styles.termsColumn}>
                            <Text style={styles.termItem}>• 5 years standard warranty</Text>
                            <Text style={styles.termItem}>• Free services as per schedule</Text>
                            <Text style={styles.termItem}>• Roadside assistance included</Text>
                        </View>
                        <View style={styles.termsColumn}>
                            <Text style={styles.termItem}>• Genuine parts only</Text>
                            <Text style={styles.termItem}>• Service at authorized centers</Text>
                            <Text style={styles.termItem}>• Subject to Bajaj terms</Text>
                        </View>
                    </View>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>Customer Signature</Text>
                        <Text style={styles.signaturePlaceholder}>_________________________</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text style={styles.signatureLabel}>For ANITA MOTORS (BAJAJ)</Text>
                        <Text style={styles.signaturePlaceholder}>_________________________</Text>
                        <Text style={styles.signatureNote}>Authorized Bajaj Dealer</Text>
                    </View>
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
                                                    setHsnNumber(bill.hsnNumber || '');
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

                    <div className="mb-4">
                        <label htmlFor="hsnNumber" className="block text-gray-700 font-semibold mb-2">
                            HSN Number
                        </label>
                        <input
                            type="text"
                            id="hsnNumber"
                            value={hsnNumber}
                            onChange={(e) => setHsnNumber(e.target.value)}
                            placeholder="Enter HSN Number"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
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
                    {billFormat === 'standard' ? (
                        <>
                            {/* Standard Format Invoice */}
                            <div className="border-b-2 border-blue-700 pb-4 mb-4">
                                <div className="text-center mb-4">
                                    <h1 className="text-2xl font-bold">Tax Invoice</h1>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold">ANITA MOTORS</h2>
                                        <p className="text-sm">Shop no 2, Rahate complex, Jawahar Nagar,</p>
                                        <p className="text-sm">Email: anitamotors@example.com</p>
                                        <p className="text-sm font-semibold mt-2">GSTIN: 27CSZPR0818J1ZX | State: Maharashtra (30)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">Invoice No: {billData.billNumber}</p>
                                        <p>Date: {new Date(billData.date).toLocaleDateString('en-IN')}</p>
                                        <p>Mode: {billData.paymentMode || 'Cash'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <h3 className="font-bold border-b pb-1">BILL TO:</h3>
                                    <p className="font-semibold">{billData.customerName}</p>
                                    <p>Contact: {billData.customerContact || '-'}</p>
                                    <p>Address: {billData.customerAddress || '-'}</p>
                                </div>
                                <div>
                                    <h3 className="font-bold border-b pb-1">VEHICLE DETAILS:</h3>
                                    <p className="font-semibold">{vehicle.name} {vehicle.model}</p>
                                    <p>Color: {vehicle.color || 'N/A'}</p>
                                    <p>Motor No: {billData.motorNo}</p>
                                    <p>Chassis No: {billData.chassisNo}</p>
                                    {billData.batteryNo && <p>Battery No: {billData.batteryNo}</p>}
                                    {billData.controllerNo && <p>Controller No: {billData.controllerNo}</p>}
                                </div>
                            </div>

                            <div className="mb-6">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">#</th>
                                            <th className="border p-2 text-left">DESCRIPTION</th>
                                            <th className="border p-2 text-left">HSN</th>
                                            <th className="border p-2 text-right">RATE</th>
                                            <th className="border p-2 text-center">QTY</th>
                                            <th className="border p-2 text-right">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border p-2">1</td>
                                            <td className="border p-2">{vehicle.name} {vehicle.model}</td>
                                            <td className="border p-2">{hsnNumber}</td>
                                            <td className="border p-2 text-right">{(basePrice / billData.quantity).toFixed(2)}</td>
                                            <td className="border p-2 text-center">{billData.quantity}</td>
                                            <td className="border p-2 text-right">{basePrice.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between border-b py-1">
                                    <span>Subtotal:</span>
                                    <span>₹{basePrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b py-1">
                                    <span>CGST (2.5%):</span>
                                    <span>₹{cgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b py-1">
                                    <span>SGST (2.5%):</span>
                                    <span>₹{sgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg mt-2">
                                    <span>TOTAL AMOUNT:</span>
                                    <span>₹{finalAmount.toFixed(2)}</span>
                                </div>
                                <div className="mt-2 text-sm">
                                    <p>Amount in Words: {numberToWords(finalAmount)}</p>
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <div className="text-center">
                                    <p className="border-t-2 border-black pt-2 inline-block">Customer Signature</p>
                                </div>
                                <div className="text-center">
                                    <p className="border-t-2 border-black pt-2 inline-block">For ANITA MOTORS</p>
                                    <p className="text-sm">Authorized Signatory</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <h3 className="font-bold border-b pb-1">TERMS & CONDITIONS:</h3>
                                    <ul className="list-disc pl-5 text-sm">
                                        <li>Battery should not be over charged, if it is seen that the battery is bulging then the warranty will be terminated.y</li>
                                        <li>Get all the batteries balanced by rotating in every 3 months from your nearest dealer</li>
                                        <li>Keep the batteries away from water. Do not wash batteries. Batteries are sealed do not attempt to add acid</li>
                                        <li>Do not accelerate and brake abruptly. Do not over load the scooter. Keep batteries cool. Charge under shade.</li>
                                        <li>Once a month, Discharge battery fully and Charge battery fully. Charge after at-least 30 minutes of a long drive.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-bold border-b pb-1">SERVICE SCHEDULE:</h3>
                                    <ul className="text-sm">
                                        <li>1. First free service: 500 KM or 2 months ({getServiceDate(2)})</li>
                                        <li>2. Second free service: 2000 KM or 4 months ({getServiceDate(4)})</li>
                                        <li>3. Third service: 4000 KM or 6 months ({getServiceDate(6)})</li>
                                        <li>4. Fourth Paid SERVICE 6000 KM OR 8 MONTHS WHICHEVER COMES FIRST ({getServiceDate(8)})</li>
                                        <li>5. FIFTH Paid SERVICE 8000 KM OR 10 MONTHS WHICHEVER COMES FIRST ({getServiceDate(10)})</li>
                                        <li>➢ BATTERY 8+4 GUARANTEE/WARRANTY.</li>
                                        <li>➢ CONTROLLER AND MOTOR COMPLETE 1 YEAR GUARANTEE. </li>
                                        <li>➢ NO CHARGER GUARANTEE/ WARRANTY. </li>
                                        <li>➢ NO BULGING WARRANTY FOR BATTERY.</li>

                                    </ul>
                                </div>
                            </div>



                            <div className="text-center mt-8 text-sm">
                                <p>Thank you for your business!</p>
                                <p className="mt-1">ANITA MOTORS | 8468857781 | anitamotors@example.com</p>
                                <p className="mt-1 text-xs">This is a computer generated invoice. No signature required.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Bajaj Format Invoice */}
                            <div className="border-b-2 border-blue-700 pb-4 mb-4">
                                <div className="text-center mb-4">
                                    <h1 className="text-2xl font-bold">BAJAJ VEHICLE INVOICE</h1>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold">ANITA MOTORS (BAJAJ DEALER)</h2>
                                        <p className="text-sm">Shop no 2, Rahate complex, Jawahar Nagar,</p>
                                        <p className="text-sm">Email: anitamotors@example.com</p>
                                        <p className="text-sm font-semibold mt-2">GSTIN: 27CSZPR0818J1ZX | State: Maharashtra (30)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">Invoice No: {billData.billNumber}</p>
                                        <p>Date: {new Date(billData.date).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold border-b pb-1">CUSTOMER DETAILS:</h3>
                                <p className="font-semibold">{billData.customerName}</p>
                                <p>Contact: {billData.customerContact || '-'}</p>
                                <p>Address: {billData.customerAddress || '-'}</p>
                            </div>
                            {/* 
                            <div className="mb-6">
                                <h3 className="font-bold border-b pb-1">VEHICLE DETAILS:</h3>
                                <p className="font-semibold">{vehicle.name} {vehicle.model}</p>
                                <p>Color: {vehicle.color || 'N/A'}</p>
                                <p>Variant: {vehicle.variant || 'Standard'}</p>
                                <p>Motor No: {billData.motorNo}</p>
                                <p>Chassis No: {billData.chassisNo}</p>
                            </div> */}

                            <div className="mb-6">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border p-2 text-left">#</th>
                                            <th className="border p-2 text-left">DESCRIPTION</th>
                                            <th className="border p-2 text-left">HSN</th>
                                            <th className="border p-2 text-right">RATE</th>
                                            <th className="border p-2 text-center">QTY</th>
                                            <th className="border p-2 text-right">AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border p-2">1</td>
                                            <td className="border p-2">{vehicle.name} {vehicle.model}</td>
                                            <td className="border p-2">{hsnNumber}</td>
                                            <td className="border p-2 text-right">{(basePrice / billData.quantity).toFixed(2)}</td>
                                            <td className="border p-2 text-center">{billData.quantity}</td>
                                            <td className="border p-2 text-right">{basePrice.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between border-b py-1">
                                    <span>Ex-Showroom Price:</span>
                                    <span>₹{basePrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b py-1">
                                    <span>CGST (2.5%):</span>
                                    <span>₹{cgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-b py-1">
                                    <span>SGST (2.5%):</span>
                                    <span>₹{sgst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg mt-2">
                                    <span>ON-ROAD PRICE:</span>
                                    <span>₹{finalAmount.toFixed(2)}</span>
                                </div>
                                <div className="mt-2 text-sm">
                                    <p>Amount in Words: {numberToWords(finalAmount)}</p>
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <div className="text-center">
                                    <p className="border-t-2 border-black pt-2 inline-block">Customer Signature</p>
                                </div>
                                <div className="text-center">
                                    <p className="border-t-2 border-black pt-2 inline-block">For ANITA MOTORS (BAJAJ)</p>
                                    <p className="text-sm">Authorized Bajaj Dealer</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-bold border-b pb-1">BAJAJ TERMS & CONDITIONS:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ul className="list-disc pl-5 text-sm">
                                        <li>5 years standard warranty</li>
                                        <li>Free services as per schedule</li>
                                        <li>Roadside assistance included</li>
                                    </ul>
                                    <ul className="list-disc pl-5 text-sm">
                                        <li>Genuine parts only</li>
                                        <li>Service at authorized centers</li>
                                        <li>Subject to Bajaj terms</li>
                                    </ul>
                                </div>
                            </div>


                        </>
                    )}
                </div>
            )}

            <div className="flex justify-between mt-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleBillFormat('standard')}
                        className={`px-4 py-2 rounded-md ${billFormat === 'standard' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        Standard Format
                    </button>
                    <button
                        onClick={() => toggleBillFormat('bajaj')}
                        className={`px-4 py-2 rounded-md ${billFormat === 'bajaj' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        Bajaj Format
                    </button>
                </div>



                <div className="flex gap-2">
                    {editMode ? (
                        <>
                            <button
                                onClick={onCancel}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center"
                            >
                                <span className="mr-2">❌</span> Cancel
                            </button>
                            <button
                                onClick={handleSaveAndPrint}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center"
                            >
                                <span className="mr-2">💾</span> Save
                            </button>
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                            >
                                {editMode ? 'Preview' : 'Edit'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                            >
                                {editMode ? 'Preview' : 'Edit'}
                            </button>

                            <PDFDownloadLink
                                document={<MyDocument />}
                                fileName={`Invoice-${billData.billNumber}-Anita.pdf`}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                            >
                                {({ loading }) => (
                                    <>
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Download Anita Motors Invoice
                                            </>
                                        )}
                                    </>
                                )}
                            </PDFDownloadLink>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#333333'
    },

    // Header Section
    header: {
        borderBottomWidth: 2,
        borderBottomColor: '#3498db',
        paddingBottom: 10,
        marginBottom: 10
    },
    headerContent: {
        flexDirection: 'row',
    },
    headerLeft: {
        flex: 3,
    },
    headerRight: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
        letterSpacing: 1
    },
    companyAddress: {
        fontSize: 9,
        color: '#555555',
        marginBottom: 2
    },
    companyContact: {
        fontSize: 9,
        color: '#555555',
        marginBottom: 2
    },
    gstInfo: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#555555'
    },
    logoBox: {
        width: 80,
        height: 50,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    logoText: {
        fontSize: 12,
        fontWeight: 'bold'
    },

    // Title Section
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8
    },
    titleLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#3498db'
    },
    invoiceTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginHorizontal: 15,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#ecf0f1',
        borderRadius: 3
    },

    // Info Row (Invoice details and customer info)
    infoRow: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 10
    },

    // Invoice Info Section
    infoSection: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 4,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3498db'
    },
    infoItem: {
        flexDirection: 'row',
        marginBottom: 3
    },
    infoLabel: {
        width: '40%',
        fontWeight: 'bold',
        color: '#555555'
    },
    infoValue: {
        flex: 1,
        color: '#333333'
    },

    // Customer Section
    customerSection: {
        flex: 2,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    sectionHeader: {
        backgroundColor: '#ecf0f1',
        padding: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: '#2c3e50',
        fontSize: 10
    },
    sectionContent: {
        padding: 8
    },
    customerName: {
        fontWeight: 'bold',
        fontSize: 11,
        marginBottom: 3,
        color: '#2c3e50'
    },
    detailText: {
        fontSize: 9,
        color: '#555555',
        marginBottom: 2
    },

    // Vehicle Section
    vehicleSection: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10
    },
    vehicleDetailsGrid: {
        padding: 8
    },
    vehicleNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee'
    },
    vehicleName: {
        fontWeight: 'bold',
        fontSize: 11,
        color: '#2c3e50'
    },
    vehicleColor: {
        fontSize: 9,
        color: '#555555'
    },
    vehicleDetailsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 3
    },
    vehicleDetailItem: {
        flex: 1,
        flexDirection: 'row'
    },
    vehicleDetailLabel: {
        width: '40%',
        fontSize: 9,
        color: '#555555',
        fontWeight: 'bold'
    },
    vehicleDetailValue: {
        flex: 1,
        fontSize: 9,
        color: '#333333'
    },

    // Table Styles
    tableContainer: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 10
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#3498db',
        paddingVertical: 6
    },
    tableHeaderCell: {
        fontWeight: 'bold',
        fontSize: 9,
        color: 'white',
        paddingHorizontal: 5
    },
    serialNoCell: {
        width: '5%',
        textAlign: 'center'
    },
    descriptionCell: {
        width: '45%',
        paddingLeft: 5
    },
    hsnCell: {
        width: '10%',
        textAlign: 'center'
    },
    rateCell: {
        width: '15%',
        textAlign: 'right',
        paddingRight: 5
    },
    qtyCell: {
        width: '10%',
        textAlign: 'center'
    },
    amountCell: {
        width: '15%',
        textAlign: 'right',
        paddingRight: 5
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        backgroundColor: '#f9f9f9'
    },
    tableCell: {
        fontSize: 9,
        color: '#333333',
        paddingHorizontal: 5
    },

    // Calculation Section
    calculationContainer: {
        marginBottom: 40
    },
    calculationSection: {
        alignSelf: 'flex-end',
        width: '40%',
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        padding: 8
    },
    calcRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3
    },
    calcLabel: {
        fontSize: 9,
        color: '#555555'
    },
    calcValue: {
        fontSize: 9,
        color: '#333333',
        textAlign: 'right'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#dddddd'
    },
    totalLabel: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#2c3e50'
    },
    totalValue: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#2c3e50'
    },
    amountInWords: {
        marginTop: 5,
        padding: 5,
        backgroundColor: '#f0f4f8',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d9e6',
        borderStyle: 'dashed'
    },
    amountWordsText: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#555555'
    },

    // Info Columns (Terms and Service)
    infoColumns: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10
    },

    // Terms Section
    termsContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    boxHeader: {
        backgroundColor: '#ecf0f1',
        padding: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    boxTitle: {
        fontWeight: 'bold',
        color: '#2c3e50',
        fontSize: 10
    },
    termsContent: {
        padding: 5
    },
    termItem: {
        flexDirection: 'row',
        marginBottom: 2,
        alignItems: 'flex-start'
    },
    bullet: {
        marginRight: 3,
        color: '#3498db'
    },
    termText: {
        fontSize: 8,
        color: '#555555',
        flex: 1
    },

    // Service Section
    serviceContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden'
    },
    serviceContent: {
        padding: 5
    },
    serviceItem: {
        flexDirection: 'row',
        marginBottom: 2,
        alignItems: 'flex-start'
    },
    serviceNumber: {
        width: 12,
        fontSize: 8,
        color: '#555555'
    },
    serviceText: {
        fontSize: 8,
        color: '#555555',
        flex: 1
    },
    highlight: {
        fontWeight: 'bold',
        color: '#e74c3c'
    },

    // Battery Advice
    batteryAdvice: {
        backgroundColor: '#fff8e1',
        borderRadius: 4,
        padding: 8,
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: '#ffb300'
    },
    adviceText: {
        fontSize: 8,
        color: '#5d4037',
        fontStyle: 'italic'
    },

    // Signature Section
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    signatureBox: {
        width: '40%',
        alignItems: 'center'
    },
    signatureLine: {
        height: 1,
        width: '100%',
        backgroundColor: '#cccccc',
        marginBottom: 5
    },
    signatureLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#555555'
    },
    signatureTitle: {
        fontSize: 8,
        color: '#777777',
        fontStyle: 'italic'
    },

    // Footer
    footer: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingTop: 10,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5
    },
    footerDivider: {
        width: '30%',
        height: 2,
        backgroundColor: '#3498db',
        marginBottom: 5
    },
    footerContact: {
        fontSize: 8,
        color: '#555555',
        marginBottom: 3
    },
    footerNote: {
        fontSize: 7,
        color: '#888888',
        fontStyle: 'italic'
    }
});

export default BillGenerator;