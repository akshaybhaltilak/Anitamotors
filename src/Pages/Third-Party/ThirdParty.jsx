import React, { useState, useEffect } from 'react';
import { database } from '../../Database/firebaseconfig';
import { ref, set, push, onValue, remove, update } from 'firebase/database';

const ExpenseManagement = () => {
  // State management
  const [expenses, setExpenses] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dailyExpenses');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'misc',
    date: new Date().toISOString().substr(0, 10)
  });
  const [workerForm, setWorkerForm] = useState({
    name: '',
    paymentGiven: '',
    paymentDue: '',
    workDescription: '',
    date: new Date().toISOString().substr(0, 10)
  });
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().substr(0, 10));
  const [totalExpense, setTotalExpense] = useState(0);

  // Fetch data from Firebase
  useEffect(() => {
    const expensesRef = ref(database, 'expenses');
    const workersRef = ref(database, 'workers');

    const unsubscribeExpenses = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      const expensesList = [];
      
      if (data) {
        Object.keys(data).forEach(key => {
          expensesList.push({ id: key, ...data[key] });
        });
      }
      
      setExpenses(expensesList);
      calculateTotal(expensesList, filterDate);
      setIsLoading(false);
    });

    const unsubscribeWorkers = onValue(workersRef, (snapshot) => {
      const data = snapshot.val();
      const workersList = [];
      
      if (data) {
        Object.keys(data).forEach(key => {
          workersList.push({ id: key, ...data[key] });
        });
      }
      
      setWorkers(workersList);
      setIsLoading(false);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeWorkers();
    };
  }, [filterDate]);

  // Calculate total expenses for the selected date
  const calculateTotal = (expenseList, date) => {
    const dailyTotal = expenseList
      .filter(expense => expense.date === date)
      .reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
    
    setTotalExpense(dailyTotal);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWorkerChange = (e) => {
    const { name, value } = e.target;
    setWorkerForm(prev => ({ ...prev, [name]: value }));
  };

  // Add or update expense
  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      timestamp: Date.now()
    };

    if (editMode && currentId) {
      // Update existing expense
      const expenseRef = ref(database, `expenses/${currentId}`);
      update(expenseRef, expenseData)
        .then(() => {
          resetExpenseForm();
        })
        .catch(error => {
          console.error("Error updating expense: ", error);
        });
    } else {
      // Add new expense
      const expensesRef = ref(database, 'expenses');
      push(expensesRef, expenseData)
        .then(() => {
          resetExpenseForm();
        })
        .catch(error => {
          console.error("Error adding expense: ", error);
        });
    }
  };

  // Add or update worker payment
  const handleWorkerSubmit = (e) => {
    e.preventDefault();
    
    if (!workerForm.name || !workerForm.workDescription) {
      alert('Please fill in all required fields');
      return;
    }

    const workerData = {
      ...workerForm,
      paymentGiven: parseFloat(workerForm.paymentGiven || 0),
      paymentDue: parseFloat(workerForm.paymentDue || 0),
      timestamp: Date.now()
    };

    if (editMode && currentId) {
      // Update existing worker payment
      const workerRef = ref(database, `workers/${currentId}`);
      update(workerRef, workerData)
        .then(() => {
          resetWorkerForm();
        })
        .catch(error => {
          console.error("Error updating worker payment: ", error);
        });
    } else {
      // Add new worker payment
      const workersRef = ref(database, 'workers');
      push(workersRef, workerData)
        .then(() => {
          resetWorkerForm();
        })
        .catch(error => {
          console.error("Error adding worker payment: ", error);
        });
    }
  };

  // Delete expense
  const handleDeleteExpense = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const expenseRef = ref(database, `expenses/${id}`);
      remove(expenseRef)
        .catch(error => {
          console.error("Error removing expense: ", error);
        });
    }
  };

  // Delete worker payment
  const handleDeleteWorker = (id) => {
    if (window.confirm('Are you sure you want to delete this worker payment?')) {
      const workerRef = ref(database, `workers/${id}`);
      remove(workerRef)
        .catch(error => {
          console.error("Error removing worker payment: ", error);
        });
    }
  };

  // Edit expense
  const handleEditExpense = (expense) => {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date
    });
    setEditMode(true);
    setCurrentId(expense.id);
  };

  // Edit worker payment
  const handleEditWorker = (worker) => {
    setWorkerForm({
      name: worker.name,
      paymentGiven: worker.paymentGiven.toString(),
      paymentDue: worker.paymentDue.toString(),
      workDescription: worker.workDescription,
      date: worker.date
    });
    setEditMode(true);
    setCurrentId(worker.id);
  };

  // Reset forms
  const resetExpenseForm = () => {
    setFormData({
      description: '',
      amount: '',
      category: 'misc',
      date: new Date().toISOString().substr(0, 10)
    });
    setEditMode(false);
    setCurrentId(null);
  };

  const resetWorkerForm = () => {
    setWorkerForm({
      name: '',
      paymentGiven: '',
      paymentDue: '',
      workDescription: '',
      date: new Date().toISOString().substr(0, 10)
    });
    setEditMode(false);
    setCurrentId(null);
  };

  // Filter expenses by date
  const filteredExpenses = expenses.filter(expense => expense.date === filterDate);
  
  // Filter workers by date
  const filteredWorkers = workers.filter(worker => worker.date === filterDate);

  // Format currency
  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="bg-blue-600 text-white p-4 rounded-t-lg shadow">
          <h1 className="text-2xl font-bold">Anita Motors Expense Management</h1>
          <p className="text-sm opacity-80">Track all showroom expenses efficiently</p>
        </header>

        <div className="bg-white p-4 rounded-b-lg shadow mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div className="mb-2 md:mb-0">
              <label className="block text-sm font-medium text-gray-700">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="border border-gray-300 p-2 rounded mt-1"
              />
            </div>
            <div className="flex space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <span className="text-sm text-blue-800 font-medium">Total Expenses:</span>
                <p className="text-xl font-bold text-blue-800">{formatCurrency(totalExpense)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex">
            <button 
              onClick={() => setActiveTab('dailyExpenses')}
              className={`py-2 px-6 rounded-t-lg ${activeTab === 'dailyExpenses' ? 'bg-white font-bold' : 'bg-gray-200'}`}
            >
              Daily Expenses
            </button>
            <button 
              onClick={() => setActiveTab('workerPayments')}
              className={`py-2 px-6 rounded-t-lg ${activeTab === 'workerPayments' ? 'bg-white font-bold' : 'bg-gray-200'}`}
            >
              Worker Payments
            </button>
          </div>

          <div className="bg-white p-4 rounded-b-lg rounded-tr-lg shadow">
            {activeTab === 'dailyExpenses' ? (
              <>
                <form onSubmit={handleExpenseSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">{editMode ? 'Edit Expense' : 'Add New Expense'}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description*</label>
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)*</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        required
                      />
                    </div>
                  
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full border border-gray-300 p-2 rounded"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {editMode ? 'Update Expense' : 'Add Expense'}
                    </button>
                    {editMode && (
                      <button
                        type="button"
                        onClick={resetExpenseForm}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Expenses for {new Date(filterDate).toLocaleDateString('en-IN')}</h2>
                  {isLoading ? (
                    <p className="text-center py-4">Loading expenses...</p>
                  ) : filteredExpenses.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-700">Description</th>
                            <th className="px-4 py-2 text-left text-gray-700">Category</th>
                            <th className="px-4 py-2 text-left text-gray-700">Amount</th>
                            <th className="px-4 py-2 text-center text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredExpenses.map(expense => (
                            <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3">{expense.description}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  expense.category === 'welding' ? 'bg-orange-100 text-orange-800' :
                                  expense.category === 'parts' ? 'bg-blue-100 text-blue-800' :
                                  expense.category === 'utilities' ? 'bg-green-100 text-green-800' :
                                  expense.category === 'maintenance' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium">{formatCurrency(expense.amount)}</td>
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => handleEditExpense(expense)}
                                  className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteExpense(expense.id)}
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
                  ) : (
                    <p className="text-center py-4 bg-gray-50 rounded">No expenses found for this date</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handleWorkerSubmit} className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h2 className="text-xl font-bold mb-4">{editMode ? 'Edit Worker Payment' : 'Add Worker Payment'}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Worker Name*</label>
                      <input
                        type="text"
                        name="name"
                        value={workerForm.name}
                        onChange={handleWorkerChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Given (₹)</label>
                      <input
                        type="number"
                        name="paymentGiven"
                        value={workerForm.paymentGiven}
                        onChange={handleWorkerChange}
                        className="w-full border border-gray-300 p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Due (₹)</label>
                      <input
                        type="number"
                        name="paymentDue"
                        value={workerForm.paymentDue}
                        onChange={handleWorkerChange}
                        className="w-full border border-gray-300 p-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Work Description*</label>
                      <input
                        type="text"
                        name="workDescription"
                        value={workerForm.workDescription}
                        onChange={handleWorkerChange}
                        className="w-full border border-gray-300 p-2 rounded"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        value={workerForm.date}
                        onChange={handleWorkerChange}
                        className="w-full border border-gray-300 p-2 rounded"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {editMode ? 'Update Worker Payment' : 'Add Worker Payment'}
                    </button>
                    {editMode && (
                      <button
                        type="button"
                        onClick={resetWorkerForm}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-4">Worker Payments for {new Date(filterDate).toLocaleDateString('en-IN')}</h2>
                  {isLoading ? (
                    <p className="text-center py-4">Loading worker payments...</p>
                  ) : filteredWorkers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-700">Worker Name</th>
                            <th className="px-4 py-2 text-left text-gray-700">Work Description</th>
                            <th className="px-4 py-2 text-left text-gray-700">Payment Given</th>
                            <th className="px-4 py-2 text-left text-gray-700">Payment Due</th>
                            <th className="px-4 py-2 text-center text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWorkers.map(worker => (
                            <tr key={worker.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{worker.name}</td>
                              <td className="px-4 py-3">{worker.workDescription}</td>
                              <td className="px-4 py-3">{formatCurrency(worker.paymentGiven)}</td>
                              <td className={`px-4 py-3 ${worker.paymentDue > 0 ? 'text-red-600 font-medium' : ''}`}>
                                {formatCurrency(worker.paymentDue)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => handleEditWorker(worker)}
                                  className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteWorker(worker.id)}
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
                  ) : (
                    <p className="text-center py-4 bg-gray-50 rounded">No worker payments found for this date</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseManagement;