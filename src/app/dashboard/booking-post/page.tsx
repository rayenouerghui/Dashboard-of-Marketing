"use client";
import React, { useState, useEffect } from "react";

export const dynamic = 'force-dynamic';

interface Booking {
  date: string;
  timeSlot: string;
  bookedBy: string;
  postType: string;
  bookedAt: string;
}

const TIME_SLOTS = [
  { id: "12:00-15:00", label: "12:00 – 15:00" },
  { id: "19:00-22:00", label: "19:00 – 22:00" },
];

const POST_TYPES = [
  { id: "reel", label: "Reel" },
  { id: "post", label: "Post" },
  { id: "story", label: "Story" },
  { id: "carousel", label: "Carousel" },
  { id: "other", label: "Other" },
];

export default function BookingPostPage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [postType, setPostType] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load bookings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("postBookings");
    if (saved) {
      try {
        setBookings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse bookings", e);
        setBookings([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save bookings to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem("postBookings", JSON.stringify(bookings));
  }, [bookings, isLoaded]);

  const isSlotBooked = (date: string, timeSlot: string): boolean => {
    return bookings.some(
      (booking) => booking.date === date && booking.timeSlot === timeSlot
    );
  };

  const handleBook = (timeSlot: string) => {
    if (!selectedDate) {
      alert("Please select a date first");
      return;
    }

    if (!userName.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!postType) {
      alert("Please select a post type");
      return;
    }

    if (isSlotBooked(selectedDate, timeSlot)) {
      alert("This slot is already booked");
      return;
    }

    const newBooking: Booking = {
      date: selectedDate,
      timeSlot,
      bookedBy: userName.trim(),
      postType,
      bookedAt: new Date().toISOString(),
    };

    setBookings([...bookings, newBooking]);
    alert(`Successfully booked ${timeSlot} on ${selectedDate}`);
  };

  const handleCancel = (date: string, timeSlot: string) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      setBookings(
        bookings.filter(
          (b) => !(b.date === date && b.timeSlot === timeSlot)
        )
      );
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getBookingsCountForDate = (date: string) => {
    return bookings.filter((b) => b.date === date).length;
  };

  const isDateFullyBooked = (date: string) => {
    return getBookingsCountForDate(date) >= TIME_SLOTS.length;
  };

  const handleDateSelect = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    if (dateStr < today || dateStr > maxDateStr) {
      return;
    }

    setSelectedDate(dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Day headers
    days.push(
      <div key="headers" className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>
    );

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateStr = date.toISOString().split("T")[0];
      const isPast = dateStr < today;
      const isFuture = dateStr > maxDateStr;
      const isSelected = dateStr === selectedDate;
      const bookingsCount = getBookingsCountForDate(dateStr);
      const isFullyBooked = isDateFullyBooked(dateStr);

      days.push(
        <button
          key={day}
          onClick={() => !isPast && !isFuture && handleDateSelect(date)}
          disabled={isPast || isFuture}
          className={`h-10 rounded-lg text-sm font-medium transition-all ${
            isPast || isFuture
              ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : isSelected
              ? "bg-brand-500 text-white"
              : isFullyBooked
              ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <span>{day}</span>
            {bookingsCount > 0 && !isPast && !isFuture && (
              <span className="text-xs mt-0.5">{bookingsCount}/{TIME_SLOTS.length}</span>
            )}
          </div>
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Booking Post
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date and time slot to book your post
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-brand-500"></div>
            <span className="text-gray-600 dark:text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/20"></div>
            <span className="text-gray-600 dark:text-gray-400">Fully Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700"></div>
            <span className="text-gray-600 dark:text-gray-400">Available</span>
          </div>
        </div>
      </div>

      {/* Time Slots (shown when date is selected) */}
      {selectedDate && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {selectedDate}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a time slot to book
            </p>
          </div>

          {/* Name Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Post Type Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Post Type
            </label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select post type</option>
              {POST_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Slots */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TIME_SLOTS.map((slot) => {
              const booked = isSlotBooked(selectedDate, slot.id);
              const booking = bookings.find(
                (b) => b.date === selectedDate && b.timeSlot === slot.id
              );

              return (
                <div
                  key={slot.id}
                  className={`rounded-lg border-2 p-4 transition-all ${
                    booked
                      ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20"
                      : "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-lg font-semibold text-gray-800 dark:text-white">
                        {slot.label}
                      </p>
                      {booked && booking && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Booked by: {booking.bookedBy} ({booking.postType})
                        </p>
                      )}
                    </div>
                    <div>
                      {booked ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Booked
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                  {booked ? (
                    <div
                      onClick={() => handleCancel(selectedDate, slot.id)}
                      className="mt-3 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
                    >
                      Cancel Booking
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBook(slot.id)}
                      className="mt-3 w-full rounded-lg bg-brand-500 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                    >
                      Book This Slot
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Bookings */}
      {bookings.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
            All Bookings
          </h2>
          <div className="space-y-3">
            {bookings
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((booking, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/50"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {booking.date}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {booking.timeSlot} • {booking.bookedBy} ({booking.postType})
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancel(booking.date, booking.timeSlot)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
