"use client";
import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { getPhysicalAttractionLeads } from "@/lib/dataUtils";
import { PhysicalAttractionLead } from "@/lib/dataUtils";

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    university: string;
    universityLogo?: string;
    note?: string;
    attractionType: string;
    personResponsible?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    accountStatus?: string;
  };
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: () => void;
  event?: CalendarEvent;
  mode: "add" | "edit";
}

const AttractionModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave, onDelete, event, mode }) => {
  const [formData, setFormData] = useState({
    university: "",
    universityLogo: "",
    note: "",
  });

  const universityLogos = [
    "ECB.png",
    "ENS_Logo_TL.jpg",
    "ESPRIT.jpg",
    "ESSECT.jpg",
    "FMT.png",
    "FSHST.jpg",
    "HIDE.png",
    "ISBAT.jpg",
    "ISG.jpg",
    "ISMT.jpg",
    "TBS.jpg",
    "ensit.jpg",
    "iseaht-logo.jpg",
    "iset chargia.jpg",
  ];

  useEffect(() => {
    if (event && mode === "edit") {
      setFormData({
        university: event.extendedProps.university || "",
        universityLogo: event.extendedProps.universityLogo || "",
        note: event.extendedProps.note || "",
      });
    }
  }, [event, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: event?.id,
      title: `${formData.university} - Physical Attraction`,
      start: event?.start || new Date().toISOString().split('T')[0],
      backgroundColor: "#465FFF",
      borderColor: "#465FFF",
      extendedProps: {
        university: formData.university,
        universityLogo: formData.universityLogo,
        note: formData.note,
        attractionType: "Physical Attraction",
      },
    };
    onSave(newEvent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {mode === "add" ? "Add Attraction" : "Edit Attraction"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              University Name
            </label>
            <input
              type="text"
              required
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              University Logo
            </label>
            <select
              value={formData.universityLogo}
              onChange={(e) => setFormData({ ...formData, universityLogo: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a logo</option>
              {universityLogos.map((logo) => (
                <option key={logo} value={`/images/university-logos/${logo}`}>
                  {logo}
                </option>
              ))}
            </select>
            {formData.universityLogo && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={formData.universityLogo}
                  alt="University Logo Preview"
                  className="h-12 w-12 object-contain rounded border border-gray-200 dark:border-gray-700"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Preview</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {mode === "add" ? "Add" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            {mode === "edit" && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CalendarPage() {
  const physicalLeads = getPhysicalAttractionLeads();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load custom events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("customCalendarEvents");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomEvents(parsed);
      } catch (e) {
        console.error("Failed to parse custom events from localStorage", e);
        setCustomEvents([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save custom events to localStorage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return; // Don't save during initial load
    
    try {
      localStorage.setItem("customCalendarEvents", JSON.stringify(customEvents));
    } catch (e) {
      console.error("Failed to save custom events to localStorage", e);
    }
  }, [customEvents, isLoaded]);

  useEffect(() => {
    // Convert physical attraction leads to calendar events
    const calendarEvents = physicalLeads.map((lead: PhysicalAttractionLead) => {
      const date = new Date(lead.submittedAt);
      return {
        id: `lead-${lead.expaId}`,
        title: `${lead.university.split(':')[0]?.trim() || lead.university} - ${lead.internshipType}`,
        start: date.toISOString().split('T')[0],
        backgroundColor: lead.accountStatus.includes('✅') ? '#10B981' : '#F59E0B',
        borderColor: lead.accountStatus.includes('✅') ? '#10B981' : '#F59E0B',
        extendedProps: {
          university: lead.university,
          internshipType: lead.internshipType,
          referral: lead.referral,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          accountStatus: lead.accountStatus,
          attractionType: lead.internshipType,
        }
      };
    });

    setEvents([...calendarEvents, ...customEvents]);
  }, [physicalLeads, customEvents]);

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.dateStr);
    setSelectedEvent(undefined);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const handleEventClick = (info: any) => {
    const event = info.event;
    // Check if it's a custom event (starts with "custom-")
    if (event.id?.startsWith("custom-")) {
      setSelectedEvent({
        id: event.id,
        title: event.title,
        start: event.startStr,
        backgroundColor: event.backgroundColor,
        borderColor: event.borderColor,
        extendedProps: event.extendedProps,
      });
      setModalMode("edit");
      setIsModalOpen(true);
    } else {
      // Show lead details for existing leads
      const props = event.extendedProps;
      alert(`
University: ${props.university}
Internship Type: ${props.internshipType}
Referral: ${props.referral}
Name: ${props.firstName} ${props.lastName}
Email: ${props.email}
Status: ${props.accountStatus}
      `);
    }
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    if (modalMode === "add") {
      const newEvent = { ...event, id: `custom-${Date.now()}` };
      setCustomEvents([...customEvents, newEvent]);
    } else {
      setCustomEvents(customEvents.map(e => e.id === event.id ? event : e));
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent?.id) {
      setCustomEvents(customEvents.filter(e => e.id !== selectedEvent.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track attraction days and events. Click a date to add an attraction.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek,dayGridDay"
          }}
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          editable={true}
          selectable={true}
          dayMaxEvents={true}
          eventDisplay="block"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Account Created</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-600 dark:text-gray-400">Account Exists</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Custom Attraction</span>
        </div>
      </div>

      {/* Modal */}
      <AttractionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent ? { ...selectedEvent, start: selectedDate } : undefined}
        mode={modalMode}
      />
    </div>
  );
}
