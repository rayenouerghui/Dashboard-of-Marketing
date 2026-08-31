"use client";
import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { PhysicalAttractionLead } from "@/lib/dataUtils";
import { useAuth } from "@/context/AuthContext";

interface CalendarPageClientProps {
  initialLeads: PhysicalAttractionLead[];
}

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

const getInitialFormData = (event?: CalendarEvent, mode: "add" | "edit" = "add") => {
  if (event && mode === "edit") {
    return {
      date: event.start || new Date().toISOString().split("T")[0],
      university: event.extendedProps.university || "",
      universityLogo: event.extendedProps.universityLogo || "",
      note: event.extendedProps.note || "",
    };
  }

  return {
    date: event?.start || new Date().toISOString().split("T")[0],
    university: "",
    universityLogo: "",
    note: "",
  };
};

const AttractionModal: React.FC<ModalProps> = ({ isOpen, onClose, onSave, onDelete, event, mode }) => {
  const [formData, setFormData] = useState(() => getInitialFormData(event, mode));

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: CalendarEvent = {
      id: event?.id,
      title: `${formData.university} - Physical Attraction`,
      start: formData.date,
      backgroundColor: "#465FFF",
      borderColor: "#465FFF",
      extendedProps: {
        university: formData.university,
        universityLogo: formData.universityLogo,
        note: formData.note,
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
              Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

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
                <Image
                  src={formData.universityLogo}
                  alt="University Logo Preview"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded border border-gray-200 object-contain dark:border-gray-700"
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
              {mode === "add" ? "Add attraction" : "Save changes"}
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

export default function CalendarPageClient({ initialLeads }: CalendarPageClientProps) {
  const { role } = useAuth();
  const physicalLeads = initialLeads;
  const [customEvents, setCustomEvents] = useState<CalendarEvent[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const saved = localStorage.getItem("customCalendarEvents");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Failed to parse custom events from localStorage", error);
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<string>("");

  const canCreateAttraction = role === "admin";

  useEffect(() => {
    try {
      localStorage.setItem("customCalendarEvents", JSON.stringify(customEvents));
    } catch (error) {
      console.error("Failed to save custom events to localStorage", error);
    }
  }, [customEvents]);

  const calendarEvents = useMemo(
    () =>
      physicalLeads.map((lead: PhysicalAttractionLead) => {
        const date = new Date(lead.submittedAt);
        return {
          id: `lead-${lead.expaId}`,
          title: `${lead.university.split(":")[0]?.trim() || lead.university} - ${lead.internshipType}`,
          start: date.toISOString().split("T")[0],
          backgroundColor: lead.accountStatus.includes("✅") ? "#10B981" : "#F59E0B",
          borderColor: lead.accountStatus.includes("✅") ? "#10B981" : "#F59E0B",
          extendedProps: {
            university: lead.university,
            internshipType: lead.internshipType,
            referral: lead.referral,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            accountStatus: lead.accountStatus,
            attractionType: lead.internshipType,
          },
        };
      }),
    [physicalLeads],
  );

  const events = useMemo(() => [...calendarEvents, ...customEvents], [calendarEvents, customEvents]);

  const handleDateClick = (arg: { dateStr: string }) => {
    if (!canCreateAttraction) return;
    setSelectedDate(arg.dateStr);
    setSelectedEvent(undefined);
    setModalMode("add");
    setIsModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const event = info.event;
    const eventExtendedProps = event.extendedProps as {
      university?: string;
      universityLogo?: string;
      note?: string;
      attractionType?: string;
      personResponsible?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      accountStatus?: string;
      internshipType?: string;
      referral?: string;
    };

    // Check if it's a custom event (starts with "custom-")
    if (event.id?.startsWith("custom-")) {
      setSelectedEvent({
        id: event.id,
        title: event.title,
        start: event.startStr,
        backgroundColor: event.backgroundColor,
        borderColor: event.borderColor,
        extendedProps: {
          university: eventExtendedProps.university || "",
          universityLogo: eventExtendedProps.universityLogo,
          note: eventExtendedProps.note,
          personResponsible: eventExtendedProps.personResponsible,
          firstName: eventExtendedProps.firstName,
          lastName: eventExtendedProps.lastName,
          email: eventExtendedProps.email,
          accountStatus: eventExtendedProps.accountStatus,
        },
      });
      setModalMode("edit");
      setIsModalOpen(true);
    } else {
      const props = eventExtendedProps;
      alert(`
University: ${props.university || "N/A"}
Internship Type: ${props.internshipType || "N/A"}
Referral: ${props.referral || "N/A"}
Name: ${props.firstName || ""} ${props.lastName || ""}
Email: ${props.email || "N/A"}
Status: ${props.accountStatus || "N/A"}
      `);
    }
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    if (modalMode === "add") {
      const newEvent = { ...event, id: `custom-${Date.now()}` };
      setCustomEvents((previous) => [...previous, newEvent]);
    } else {
      setCustomEvents((previous) => previous.map((e) => (e.id === event.id ? event : e)));
    }
  };

  const handleDeleteEvent = () => {
    if (selectedEvent?.id) {
      setCustomEvents((previous) => previous.filter((e) => e.id !== selectedEvent.id));
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
            Track attraction days and events. Click any date to add one or more attractions for that day.
          </p>
        </div>
        {canCreateAttraction && (
          <button
            onClick={() => {
              setSelectedDate(new Date().toISOString().split("T")[0]);
              setSelectedEvent(undefined);
              setModalMode("add");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Attraction
          </button>
        )}
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
        event={selectedEvent ? { ...selectedEvent, start: selectedDate || selectedEvent.start } : { id: undefined, title: "", start: selectedDate || new Date().toISOString().split("T")[0], backgroundColor: "#465FFF", borderColor: "#465FFF", extendedProps: { university: "" } }}
        mode={modalMode}
      />
    </div>
  );
}
