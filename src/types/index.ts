// Core Types for AIESEC LC Operations Dashboard

export type UserRole = 'Administrator' | 'Team Leader' | 'Member';
export type PartnershipStatus = 'Active' | 'Pending' | 'Inactive' | 'Prospect';
export type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Applied' | 'Approved' | 'Rejected';
export type LeadSource = 'Campus Event' | 'Social Media' | 'Referral' | 'Website' | 'Other';
export type ProgramType = 'Digital' | 'ICX' | 'Leadership';
export type GoalStatus = 'Active' | 'Completed' | 'Overdue' | 'Cancelled';
export type SocialPlatform = 'Facebook' | 'Instagram' | 'LinkedIn' | 'Twitter' | 'TikTok';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface University {
  id: string;
  name: string;
  location: string;
  partnershipStatus: PartnershipStatus;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  campusAmbassador?: string;
  ambassadorId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  university?: string;
  source: LeadSource;
  status: LeadStatus;
  programInterest: ProgramType[];
  assignedTo?: string;
  assignedToId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  status: GoalStatus;
  assignedTo?: string;
  assignedToId?: string;
  teamId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedById: string;
  viewCount: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMediaPost {
  id: string;
  content: string;
  platform: SocialPlatform;
  scheduledDate: Date;
  mediaUrls?: string[];
  createdBy: string;
  createdById: string;
  status: 'Draft' | 'Scheduled' | 'Published';
  createdAt: Date;
  updatedAt: Date;
}

export interface Testimonial {
  id: string;
  content: string;
  authorName: string;
  authorRole?: string;
  programType: ProgramType;
  country?: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface Analytics {
  totalLeads: number;
  activeLeads: number;
  conversionRate: number;
  goalsCompleted: number;
  goalsActive: number;
  universities: number;
  teamMembers: number;
}

export interface NotificationItem {
  id: string;
  type: 'assignment' | 'deadline' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}
