import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { database } from '../../Database/firebaseconfig';
import { ref, onValue, update, remove, push } from 'firebase/database';
import {
  Phone, ArrowLeft, Edit, Trash2, Calendar,
  MessageSquare, Save, X, ChevronDown, ChevronUp,
  Check, Clock, DollarSign, Send,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const WorkerDetailsPage = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showAttendance, setShowAttendance] = useState(true);
  const [editedWorker, setEditedWorker] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  });

  const roles = ['worker', 'mechanic', 'salesperson', 'manager', 'electrician', 'helper'];
  const categories = ['workshop', 'shop', 'outsider', 'office', 'delivery'];

  // Attendance Section function start
  // Additional helper functions to add to your component
  const calculateTotalDays = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const bulkMarkAttendance = (status) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const updatedAttendance = { ...worker.attendance };
    if (!updatedAttendance[currentMonth]) {
      updatedAttendance[currentMonth] = {};
    }

    for (let day = 1; day <= daysInMonth; day++) {
      updatedAttendance[currentMonth][day] = status;
    }

    const workerRef = ref(database, `workers/${workerId}`);
    update(workerRef, { attendance: updatedAttendance })
      .catch(error => {
        console.error("Error updating bulk attendance: ", error);
      });
  };

  // Modify renderAttendanceDays function
  const renderAttendanceDays = () => {
    if (!currentMonth) return null;

    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="bg-transparent"></div>
      );
    }

    // Render days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStatus = worker.attendance &&
        worker.attendance[currentMonth] &&
        worker.attendance[currentMonth][day] ?
        worker.attendance[currentMonth][day] : 'none';

      let statusClasses = 'bg-gray-100 text-gray-700';
      if (dayStatus === 'present') statusClasses = 'bg-green-100 text-green-700';
      if (dayStatus === 'absent') statusClasses = 'bg-red-100 text-red-700';

      days.push(
        <button
          key={day}
          className={`
          w-full aspect-square rounded-lg flex items-center justify-center 
          font-medium text-sm cursor-pointer transition-colors
          ${statusClasses}
          hover:opacity-80
        `}
          onClick={() => handleAttendanceChange(day, dayStatus)}
        >
          {day}
        </button>
      );
    }

    return days;
  };
  // Attendance Section function end 

  // Template messages for WhatsApp
  const messageTemplates = [
    { title: "Payment Reminder", message: "Hello {name}, this is a reminder that your payment of ₹{amount} is due. Please collect it from the office." },
    { title: "Attendance Reminder", message: "Hello {name}, please remember to come to work tomorrow. Your presence is important." },
    { title: "Task Assignment", message: "Hello {name}, you have been assigned a new task: {task}. Please complete it by {date}." }
  ];

  // Fetch worker data from Firebase
  useEffect(() => {
    if (!workerId) return;

    const workerRef = ref(database, `workers/${workerId}`);
    const unsubscribe = onValue(workerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setWorker({ id: workerId, ...data });
        setEditedWorker({ id: workerId, ...data });
      } else {
        navigate('/workers');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [workerId, navigate]);

  // Handle updating worker data
  const handleUpdateWorker = () => {
    const workerRef = ref(database, `workers/${workerId}`);
    update(workerRef, {
      name: editedWorker.name,
      age: editedWorker.age,
      phone: editedWorker.phone,
      role: editedWorker.role,
      category: editedWorker.category,
      salary: editedWorker.salary,
      joinDate: editedWorker.joinDate,
      note: editedWorker.note
    })
      .then(() => {
        setIsEditing(false);
      })
      .catch(error => {
        console.error("Error updating worker: ", error);
      });
  };

  // Handle worker deletion
  const handleDeleteWorker = () => {
    if (window.confirm("Are you sure you want to delete this worker? This action cannot be undone.")) {
      const workerRef = ref(database, `workers/${workerId}`);
      remove(workerRef)
        .then(() => {
          navigate('/workers');
        })
        .catch(error => {
          console.error("Error deleting worker: ", error);
        });
    }
  };

  // Handle adding advance payment
  const handleAddAdvance = () => {
    if (!advanceAmount || isNaN(parseFloat(advanceAmount)) || parseFloat(advanceAmount) <= 0) {
      alert("Please enter a valid advance amount");
      return;
    }

    const advanceData = {
      amount: parseFloat(advanceAmount),
      date: new Date().toISOString(),
      note: advanceNote || "Advance payment"
    };

    const updatedAdvances = worker.advances ? [...worker.advances, advanceData] : [advanceData];

    const workerRef = ref(database, `workers/${workerId}`);
    update(workerRef, { advances: updatedAdvances })
      .then(() => {
        setAdvanceAmount('');
        setAdvanceNote('');
        setShowAddAdvance(false);
      })
      .catch(error => {
        console.error("Error adding advance: ", error);
      });
  };

  // Handle attendance change
  const handleAttendanceChange = (day, status) => {
    if (!worker || !currentMonth) return;

    // If attendance doesn't exist for this month, create it
    const updatedAttendance = { ...worker.attendance } || {};
    if (!updatedAttendance[currentMonth]) {
      const [year, month] = currentMonth.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();

      updatedAttendance[currentMonth] = {};
      for (let i = 1; i <= daysInMonth; i++) {
        updatedAttendance[currentMonth][i] = 'none';
      }
    }

    // Toggle between present, absent, none
    let newStatus;
    if (status === 'none') newStatus = 'present';
    else if (status === 'present') newStatus = 'absent';
    else newStatus = 'none';

    updatedAttendance[currentMonth][day] = newStatus;

    const workerRef = ref(database, `workers/${workerId}`);
    update(workerRef, { attendance: updatedAttendance })
      .catch(error => {
        console.error("Error updating attendance: ", error);
      });
  };

  // Get month name from month number
  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'long' }) + ' ' + year;
  };

  // Calculate monthly stats
  const calculateMonthlyStats = () => {
    if (!worker || !worker.attendance || !worker.attendance[currentMonth]) {
      return { presentDays: 0, absentDays: 0, payment: 0, totalAdvances: 0 };
    }

    const monthAttendance = worker.attendance[currentMonth];
    const presentDays = Object.values(monthAttendance).filter(status => status === 'present').length;
    const absentDays = Object.values(monthAttendance).filter(status => status === 'absent').length;

    // Calculate payment based on present days
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyRate = worker.salary / daysInMonth;
    const basePayment = dailyRate * presentDays;

    // Calculate advances for the current month
    const advances = worker.advances || [];
    const currentMonthAdvances = advances.filter(adv => {
      const advDate = new Date(adv.date);
      return (advDate.getMonth() + 1) === month && advDate.getFullYear() === parseInt(year);
    });

    const totalAdvances = currentMonthAdvances.reduce((sum, adv) => sum + parseFloat(adv.amount), 0);
    const finalPayment = basePayment - totalAdvances;

    return {
      presentDays,
      absentDays,
      payment: finalPayment > 0 ? finalPayment : 0,
      totalAdvances,
      dailyRate
    };
  };

  // Handle message WhatsApp
  const handleSendWhatsApp = (template) => {
    const { payment } = calculateMonthlyStats();
    const formattedMessage = template.message
      .replace('{name}', worker.name)
      .replace('{amount}', payment.toFixed(0))
      .replace('{task}', 'assigned task')
      .replace('{date}', new Date().toLocaleDateString());

    const encodedMessage = encodeURIComponent(formattedMessage);
    window.open(`https://wa.me/91${worker.phone}?text=${encodedMessage}`, '_blank');
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Worker not found</h2>
          <button
            onClick={() => navigate('/workers')}
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            Back to Workers
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateMonthlyStats();

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/workers')}
          className="mr-3 p-2 bg-gray-100 rounded-full"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Worker Details</h1>
      </div>

      {/* Worker Information */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{worker.name}</h2>
            <p className="text-gray-600 flex items-center gap-1 mt-1">
              <Phone size={14} />
              {worker.phone}
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleUpdateWorker}
                  className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedWorker({ ...worker });
                  }}
                  className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={handleDeleteWorker}
                  className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name*</label>
              <input
                type="text"
                value={editedWorker.name}
                onChange={(e) => setEditedWorker({ ...editedWorker, name: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4">
              {/* <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="number"
                  value={editedWorker.age}
                  onChange={(e) => setEditedWorker({ ...editedWorker, age: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Phone Number*</label>
                <input
                  type="tel"
                  value={editedWorker.phone}
                  onChange={(e) => setEditedWorker({ ...editedWorker, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Role*</label>
                <select
                  value={editedWorker.role}
                  onChange={(e) => setEditedWorker({ ...editedWorker, role: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Category*</label>
                <select
                  value={editedWorker.category}
                  onChange={(e) => setEditedWorker({ ...editedWorker, category: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Monthly Salary*</label>
                <input
                  type="number"
                  value={editedWorker.salary}
                  onChange={(e) => setEditedWorker({ ...editedWorker, salary: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Join Date</label>
                <input
                  type="date"
                  value={editedWorker.joinDate}
                  onChange={(e) => setEditedWorker({ ...editedWorker, joinDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={editedWorker.note}
                onChange={(e) => setEditedWorker({ ...editedWorker, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              ></textarea>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <span className="text-gray-500">Role:</span>
              <span className="ml-2 font-medium capitalize">{worker.role}</span>
            </div>
            <div>
              <span className="text-gray-500">Category:</span>
              <span className="ml-2 font-medium capitalize">{worker.category}</span>
            </div>
            <div>
              <span className="text-gray-500">Age:</span>
              <span className="ml-2 font-medium">{worker.age || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-gray-500">Salary:</span>
              <span className="ml-2 font-medium">₹{worker.salary}</span>
            </div>
            <div>
              <span className="text-gray-500">Join Date:</span>
              <span className="ml-2 font-medium">{worker.joinDate}</span>
            </div>
            <div>
              <span className="text-gray-500">Daily Rate:</span>
              <span className="ml-2 font-medium">₹{stats.dailyRate?.toFixed(0) || 0}</span>
            </div>
            {worker.note && (
              <div className="col-span-2 mt-2 bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-500 mb-1">Notes:</div>
                <div>{worker.note}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <a
          href={`tel:${worker.phone}`}
          className="bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-1"
        >
          <Phone size={16} />
          Call
        </a>
        <div className="relative group">
          <button
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-1"
          >
            <MessageSquare size={16} />
            WhatsApp
          </button>
          <div className="absolute z-10 hidden group-hover:block mt-1 w-64 bg-white shadow-lg rounded-lg overflow-hidden">
            {messageTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleSendWhatsApp(template)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0"
              >
                <div className="font-medium">{template.title}</div>
                <div className="text-xs text-gray-500 truncate">{template.message}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowAddAdvance(!showAddAdvance)}
          className="bg-yellow-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-1"
        >
          <DollarSign size={16} />
          Advance
        </button>
      </div>

      {/* Advance Payment Form */}
      {showAddAdvance && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-3">Add Advance Payment</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount*</label>
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input
                type="text"
                value={advanceNote}
                onChange={(e) => setAdvanceNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Reason for advance (optional)"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddAdvance}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
              >
                Add Advance
              </button>
              <button
                onClick={() => setShowAddAdvance(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Payment Summary */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Payment Summary</h3>
          {/* <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {worker.attendance && Object.keys(worker.attendance).map(month => (
              <option key={month} value={month}>{getMonthName(month)}</option>
            ))}
          </select> */}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
            <span>Present Days:</span>
            <span className="font-medium text-green-600">{stats.presentDays} days</span>
          </div>
          <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
            <span>Absent Days:</span>
            <span className="font-medium text-red-600">{stats.absentDays} days</span>
          </div>
          <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
            <span>Daily Rate:</span>
            <span className="font-medium">₹{stats.dailyRate?.toFixed(0) || 0}</span>
          </div>
          <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
            <span>Base Payment:</span>
            <span className="font-medium">₹{(stats.payment + stats.totalAdvances).toFixed(0)}</span>
          </div>
          {stats.totalAdvances > 0 && (
            <div className="flex justify-between px-2 py-1 bg-gray-50 rounded">
              <span>Advances Taken:</span>
              <span className="font-medium text-red-600">- ₹{stats.totalAdvances.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between p-3 bg-blue-50 rounded-lg font-bold text-lg">
            <span>Final Payment:</span>
            <span className="text-blue-700">₹{stats.payment.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-blue-600" />
            <h3 className="font-semibold text-lg">Attendance</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(prevMonth => {
                const date = new Date(prevMonth);
                date.setMonth(date.getMonth() - 1);
                return `${date.getFullYear()}-${date.getMonth() + 1}`;
              })}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-medium">
              {getMonthName(currentMonth)}
            </span>
            <button
              onClick={() => setCurrentMonth(prevMonth => {
                const date = new Date(prevMonth);
                date.setMonth(date.getMonth() + 1);
                return `${date.getFullYear()}-${date.getMonth() + 1}`;
              })}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-green-600 font-bold text-2xl">
              {calculateMonthlyStats().presentDays}
            </div>
            <div className="text-xs text-green-800">Present Days</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-red-600 font-bold text-2xl">
              {calculateMonthlyStats().absentDays}
            </div>
            <div className="text-xs text-red-800">Absent Days</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-gray-600 font-bold text-2xl">
              {calculateTotalDays(currentMonth) -
                (calculateMonthlyStats().presentDays + calculateMonthlyStats().absentDays)}
            </div>
            <div className="text-xs text-gray-800">Not Marked</div>
          </div>
        </div>

        {/* Attendance Calendar */}
        <div className="grid grid-cols-7 gap-2">
          {/* Weekday Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center font-semibold text-gray-500 text-xs"
            >
              {day}
            </div>
          ))}

          {/* Render Days */}
          {renderAttendanceDays()}
        </div>

        {/* Attendance Legend */}
        <div className="flex justify-between mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span>Not Marked</span>
          </div>
        </div>

        {/* Quick Attendance Actions */}
        <div className="mt-4 flex justify-between">
          <button
            onClick={() => bulkMarkAttendance('present')}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2"
          >
            <Check size={16} /> Mark All Present
          </button>
          <button
            onClick={() => bulkMarkAttendance('absent')}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-2"
          >
            <X size={16} /> Mark All Absent
          </button>
        </div>
      </div>

      {/* Attendance section close  */}

      {/* Advance History */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Advance Payment History</h3>

        {(!worker.advances || worker.advances.length === 0) ? (
          <div className="text-sm text-gray-500 text-center py-4">
            No advance payments recorded
          </div>
        ) : (
          <div className="space-y-3">
            {worker.advances.sort((a, b) => new Date(b.date) - new Date(a.date)).map((advance, index) => (
              <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">₹{parseFloat(advance.amount).toFixed(0)}</div>
                  <div className="text-xs text-gray-500">{advance.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">
                    {new Date(advance.date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(advance.date).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDetailsPage;