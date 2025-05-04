import { users, organizations, groups, targets, smtpProfiles, emailTemplates, landingPages, campaigns, campaignResults } from "@shared/schema";
import { db } from "./db";
import { eq, and, count } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

import type { 
  User,
  InsertUser, 
  Organization, 
  InsertOrganization,
  Group,
  InsertGroup,
  Target,
  InsertTarget,
  SmtpProfile,
  InsertSmtpProfile,
  EmailTemplate,
  InsertEmailTemplate,
  LandingPage,
  InsertLandingPage,
  Campaign,
  InsertCampaign,
  CampaignResult,
  InsertCampaignResult
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { organizationId: number }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  listUsers(organizationId: number): Promise<User[]>;
  
  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByName(name: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  
  // Group methods
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(organizationId: number, group: InsertGroup): Promise<Group>;
  updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  listGroups(organizationId: number): Promise<(Group & { targetCount: number })[]>;
  
  // Target methods
  getTarget(id: number): Promise<Target | undefined>;
  createTarget(organizationId: number, groupId: number, target: InsertTarget): Promise<Target>;
  updateTarget(id: number, data: Partial<Target>): Promise<Target | undefined>;
  deleteTarget(id: number): Promise<boolean>;
  listTargets(groupId: number): Promise<Target[]>;
  
  // SMTP Profile methods
  getSmtpProfile(id: number): Promise<SmtpProfile | undefined>;
  createSmtpProfile(organizationId: number, profile: InsertSmtpProfile): Promise<SmtpProfile>;
  updateSmtpProfile(id: number, data: Partial<SmtpProfile>): Promise<SmtpProfile | undefined>;
  deleteSmtpProfile(id: number): Promise<boolean>;
  listSmtpProfiles(organizationId: number): Promise<SmtpProfile[]>;
  
  // Email Template methods
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(organizationId: number, userId: number, template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  listEmailTemplates(organizationId: number): Promise<EmailTemplate[]>;
  
  // Landing Page methods
  getLandingPage(id: number): Promise<LandingPage | undefined>;
  createLandingPage(organizationId: number, userId: number, page: InsertLandingPage): Promise<LandingPage>;
  updateLandingPage(id: number, data: Partial<LandingPage>): Promise<LandingPage | undefined>;
  deleteLandingPage(id: number): Promise<boolean>;
  listLandingPages(organizationId: number): Promise<LandingPage[]>;
  
  // Campaign methods
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(organizationId: number, userId: number, campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: number): Promise<boolean>;
  listCampaigns(organizationId: number): Promise<Campaign[]>;
  
  // Campaign Result methods
  getCampaignResult(id: number): Promise<CampaignResult | undefined>;
  createCampaignResult(organizationId: number, result: InsertCampaignResult): Promise<CampaignResult>;
  updateCampaignResult(id: number, data: Partial<CampaignResult>): Promise<CampaignResult | undefined>;
  listCampaignResults(campaignId: number): Promise<CampaignResult[]>;
  
  // Dashboard methods
  getDashboardStats(organizationId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    if (process.env.DATABASE_URL) {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        tableName: 'session',
        createTableIfMissing: true 
      });
    } else {
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      });
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(user: InsertUser & { organizationId: number }): Promise<User> {
    const [newUser] = await db.insert(users).values({
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
    }).returning();
    return newUser;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }
  
  async listUsers(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }
  
  // Organization methods
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization;
  }
  
  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.name, name));
    return organization;
  }
  
  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [newOrganization] = await db.insert(organizations).values({
      name: organization.name,
    }).returning();
    return newOrganization;
  }
  
  // Group methods
  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }
  
  async createGroup(organizationId: number, group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values({
      name: group.name,
      description: group.description,
      organizationId,
    }).returning();
    return newGroup;
  }
  
  async updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined> {
    const [updatedGroup] = await db.update(groups)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, id))
      .returning();
    return updatedGroup;
  }
  
  async deleteGroup(id: number): Promise<boolean> {
    await db.delete(groups).where(eq(groups.id, id));
    return true;
  }
  
  async listGroups(organizationId: number): Promise<(Group & { targetCount: number })[]> {
    // First get all groups
    const groupsList = await db.select().from(groups).where(eq(groups.organizationId, organizationId));
    
    // Then get target counts for each group
    const result = [];
    for (const group of groupsList) {
      const [countResult] = await db
        .select({ count: count() })
        .from(targets)
        .where(eq(targets.groupId, group.id));
      
      result.push({
        ...group,
        targetCount: Number(countResult.count) || 0
      });
    }
    
    return result;
  }
  
  // Target methods
  async getTarget(id: number): Promise<Target | undefined> {
    const [target] = await db.select().from(targets).where(eq(targets.id, id));
    return target;
  }
  
  async createTarget(organizationId: number, groupId: number, target: InsertTarget): Promise<Target> {
    const [newTarget] = await db.insert(targets).values({
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
      position: target.position,
      groupId,
      organizationId,
    }).returning();
    return newTarget;
  }
  
  async updateTarget(id: number, data: Partial<Target>): Promise<Target | undefined> {
    const [updatedTarget] = await db.update(targets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(targets.id, id))
      .returning();
    return updatedTarget;
  }
  
  async deleteTarget(id: number): Promise<boolean> {
    await db.delete(targets).where(eq(targets.id, id));
    return true;
  }
  
  async listTargets(groupId: number): Promise<Target[]> {
    return await db.select().from(targets).where(eq(targets.groupId, groupId));
  }
  
  // SMTP Profile methods
  async getSmtpProfile(id: number): Promise<SmtpProfile | undefined> {
    const [profile] = await db.select().from(smtpProfiles).where(eq(smtpProfiles.id, id));
    return profile;
  }
  
  async createSmtpProfile(organizationId: number, profile: InsertSmtpProfile): Promise<SmtpProfile> {
    const [newProfile] = await db.insert(smtpProfiles).values({
      name: profile.name,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: profile.password,
      fromName: profile.fromName,
      fromEmail: profile.fromEmail,
      organizationId,
    }).returning();
    return newProfile;
  }
  
  async updateSmtpProfile(id: number, data: Partial<SmtpProfile>): Promise<SmtpProfile | undefined> {
    const [updatedProfile] = await db.update(smtpProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(smtpProfiles.id, id))
      .returning();
    return updatedProfile;
  }
  
  async deleteSmtpProfile(id: number): Promise<boolean> {
    await db.delete(smtpProfiles).where(eq(smtpProfiles.id, id));
    return true;
  }
  
  async listSmtpProfiles(organizationId: number): Promise<SmtpProfile[]> {
    return await db.select().from(smtpProfiles).where(eq(smtpProfiles.organizationId, organizationId));
  }
  
  // Email Template methods
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }
  
  async createEmailTemplate(organizationId: number, userId: number, template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values({
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      senderName: template.senderName,
      senderEmail: template.senderEmail,
      organizationId,
      createdById: userId,
    }).returning();
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updatedTemplate] = await db.update(emailTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updatedTemplate;
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return true;
  }
  
  async listEmailTemplates(organizationId: number): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.organizationId, organizationId));
  }
  
  // Landing Page methods
  async getLandingPage(id: number): Promise<LandingPage | undefined> {
    const [page] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return page;
  }
  
  async createLandingPage(organizationId: number, userId: number, page: InsertLandingPage): Promise<LandingPage> {
    const [newPage] = await db.insert(landingPages).values({
      name: page.name,
      description: page.description,
      htmlContent: page.htmlContent,
      redirectUrl: page.redirectUrl,
      pageType: page.pageType,
      thumbnail: page.thumbnail,
      organizationId,
      createdById: userId,
    }).returning();
    return newPage;
  }
  
  async updateLandingPage(id: number, data: Partial<LandingPage>): Promise<LandingPage | undefined> {
    const [updatedPage] = await db.update(landingPages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(landingPages.id, id))
      .returning();
    return updatedPage;
  }
  
  async deleteLandingPage(id: number): Promise<boolean> {
    await db.delete(landingPages).where(eq(landingPages.id, id));
    return true;
  }
  
  async listLandingPages(organizationId: number): Promise<LandingPage[]> {
    return await db.select().from(landingPages).where(eq(landingPages.organizationId, organizationId));
  }
  
  // Campaign methods
  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }
  
  async createCampaign(organizationId: number, userId: number, campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values({
      name: campaign.name,
      targetGroupId: Number(campaign.targetGroupId),
      smtpProfileId: Number(campaign.smtpProfileId),
      emailTemplateId: Number(campaign.emailTemplateId),
      landingPageId: Number(campaign.landingPageId),
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
      endDate: campaign.endDate ? new Date(campaign.endDate) : null,
      createdById: userId,
      organizationId,
    }).returning();
    return newCampaign;
  }
  
  async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updatedCampaign] = await db.update(campaigns)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }
  
  async deleteCampaign(id: number): Promise<boolean> {
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return true;
  }
  
  async listCampaigns(organizationId: number): Promise<Campaign[]> {
    return await db.select().from(campaigns).where(eq(campaigns.organizationId, organizationId));
  }
  
  // Campaign Result methods
  async getCampaignResult(id: number): Promise<CampaignResult | undefined> {
    const [result] = await db.select().from(campaignResults).where(eq(campaignResults.id, id));
    return result;
  }
  
  async createCampaignResult(organizationId: number, result: InsertCampaignResult): Promise<CampaignResult> {
    const [newResult] = await db.insert(campaignResults).values({
      campaignId: result.campaignId,
      targetId: result.targetId,
      sent: result.sent,
      sentAt: result.sentAt,
      opened: result.opened,
      openedAt: result.openedAt,
      clicked: result.clicked,
      clickedAt: result.clickedAt,
      submitted: result.submitted,
      submittedAt: result.submittedAt,
      submittedData: result.submittedData,
      organizationId,
    }).returning();
    return newResult;
  }
  
  async updateCampaignResult(id: number, data: Partial<CampaignResult>): Promise<CampaignResult | undefined> {
    const [updatedResult] = await db.update(campaignResults)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(campaignResults.id, id))
      .returning();
    return updatedResult;
  }
  
  async listCampaignResults(campaignId: number): Promise<CampaignResult[]> {
    return await db.select().from(campaignResults).where(eq(campaignResults.campaignId, campaignId));
  }
  
  // Dashboard methods
  async getDashboardStats(organizationId: number): Promise<any> {
    // Get count of active campaigns
    const activeCampaigns = await db
      .select({ count: count() })
      .from(campaigns)
      .where(and(
        eq(campaigns.organizationId, organizationId),
        eq(campaigns.status, "Active")
      ));
    
    // Get user count
    const userCount = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.organizationId, organizationId));
    
    // Get campaign metrics
    // In a real implementation, you would calculate more detailed metrics
    // For now, we'll return a simple mock data
    
    return {
      activeCampaigns: Number(activeCampaigns[0].count) || 0,
      campaignChange: 12, // Mock data
      successRate: 32.8, // Mock data
      successRateChange: 5.2, // Mock data
      totalUsers: Number(userCount[0].count) || 0,
      newUsers: 3, // Mock data
      trainingCompletion: 78, // Mock data
      trainingCompletionChange: 8, // Mock data
    };
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private groups: Map<number, Group>;
  private targets: Map<number, Target>;
  private smtpProfiles: Map<number, SmtpProfile>;
  private emailTemplates: Map<number, EmailTemplate>;
  private landingPages: Map<number, LandingPage>;
  private campaigns: Map<number, Campaign>;
  private campaignResults: Map<number, CampaignResult>;
  
  currentId: number;
  sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.groups = new Map();
    this.targets = new Map();
    this.smtpProfiles = new Map();
    this.emailTemplates = new Map();
    this.landingPages = new Map();
    this.campaigns = new Map();
    this.campaignResults = new Map();
    
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  async createUser(user: InsertUser & { organizationId: number }): Promise<User> {
    const id = this.currentId++;
    const now = new Date();
    const newUser: User = {
      id,
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin || false,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...data,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async listUsers(organizationId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.organizationId === organizationId
    );
  }
  
  // Organization methods
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }
  
  async getOrganizationByName(name: string): Promise<Organization | undefined> {
    return Array.from(this.organizations.values()).find(
      (org) => org.name.toLowerCase() === name.toLowerCase()
    );
  }
  
  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const id = this.currentId++;
    const now = new Date();
    const newOrg: Organization = {
      id,
      name: organization.name,
      createdAt: now,
      updatedAt: now
    };
    this.organizations.set(id, newOrg);
    return newOrg;
  }
  
  // Group methods
  async getGroup(id: number): Promise<Group | undefined> {
    return this.groups.get(id);
  }
  
  async createGroup(organizationId: number, group: InsertGroup): Promise<Group> {
    const id = this.currentId++;
    const now = new Date();
    const newGroup: Group = {
      id,
      name: group.name,
      description: group.description || null,
      organizationId,
      createdAt: now,
      updatedAt: now
    };
    this.groups.set(id, newGroup);
    return newGroup;
  }
  
  async updateGroup(id: number, data: Partial<Group>): Promise<Group | undefined> {
    const group = this.groups.get(id);
    if (!group) return undefined;
    
    const updatedGroup = {
      ...group,
      ...data,
      updatedAt: new Date()
    };
    this.groups.set(id, updatedGroup);
    return updatedGroup;
  }
  
  async deleteGroup(id: number): Promise<boolean> {
    // Delete all targets in the group first
    for (const [targetId, target] of this.targets.entries()) {
      if (target.groupId === id) {
        this.targets.delete(targetId);
      }
    }
    return this.groups.delete(id);
  }
  
  async listGroups(organizationId: number): Promise<(Group & { targetCount: number })[]> {
    const orgGroups = Array.from(this.groups.values()).filter(
      (group) => group.organizationId === organizationId
    );
    
    return orgGroups.map(group => {
      const targetCount = Array.from(this.targets.values()).filter(
        target => target.groupId === group.id
      ).length;
      
      return {
        ...group,
        targetCount
      };
    });
  }
  
  // Target methods
  async getTarget(id: number): Promise<Target | undefined> {
    return this.targets.get(id);
  }
  
  async createTarget(organizationId: number, groupId: number, target: InsertTarget): Promise<Target> {
    const id = this.currentId++;
    const now = new Date();
    const newTarget: Target = {
      id,
      firstName: target.firstName,
      lastName: target.lastName,
      email: target.email,
      position: target.position || null,
      groupId,
      organizationId,
      createdAt: now,
      updatedAt: now
    };
    this.targets.set(id, newTarget);
    return newTarget;
  }
  
  async updateTarget(id: number, data: Partial<Target>): Promise<Target | undefined> {
    const target = this.targets.get(id);
    if (!target) return undefined;
    
    const updatedTarget = {
      ...target,
      ...data,
      updatedAt: new Date()
    };
    this.targets.set(id, updatedTarget);
    return updatedTarget;
  }
  
  async deleteTarget(id: number): Promise<boolean> {
    return this.targets.delete(id);
  }
  
  async listTargets(groupId: number): Promise<Target[]> {
    return Array.from(this.targets.values()).filter(
      (target) => target.groupId === groupId
    );
  }
  
  // SMTP Profile methods
  async getSmtpProfile(id: number): Promise<SmtpProfile | undefined> {
    return this.smtpProfiles.get(id);
  }
  
  async createSmtpProfile(organizationId: number, profile: InsertSmtpProfile): Promise<SmtpProfile> {
    const id = this.currentId++;
    const now = new Date();
    const newProfile: SmtpProfile = {
      id,
      name: profile.name,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      password: profile.password,
      fromName: profile.fromName,
      fromEmail: profile.fromEmail,
      organizationId,
      createdAt: now,
      updatedAt: now
    };
    this.smtpProfiles.set(id, newProfile);
    return newProfile;
  }
  
  async updateSmtpProfile(id: number, data: Partial<SmtpProfile>): Promise<SmtpProfile | undefined> {
    const profile = this.smtpProfiles.get(id);
    if (!profile) return undefined;
    
    const updatedProfile = {
      ...profile,
      ...data,
      updatedAt: new Date()
    };
    this.smtpProfiles.set(id, updatedProfile);
    return updatedProfile;
  }
  
  async deleteSmtpProfile(id: number): Promise<boolean> {
    return this.smtpProfiles.delete(id);
  }
  
  async listSmtpProfiles(organizationId: number): Promise<SmtpProfile[]> {
    return Array.from(this.smtpProfiles.values()).filter(
      (profile) => profile.organizationId === organizationId
    );
  }
  
  // Email Template methods
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }
  
  async createEmailTemplate(organizationId: number, userId: number, template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = this.currentId++;
    const now = new Date();
    const newTemplate: EmailTemplate = {
      id,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || null,
      senderName: template.senderName,
      senderEmail: template.senderEmail,
      organizationId,
      createdById: userId,
      createdAt: now,
      updatedAt: now
    };
    this.emailTemplates.set(id, newTemplate);
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = this.emailTemplates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate = {
      ...template,
      ...data,
      updatedAt: new Date()
    };
    this.emailTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    return this.emailTemplates.delete(id);
  }
  
  async listEmailTemplates(organizationId: number): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values()).filter(
      (template) => template.organizationId === organizationId
    );
  }
  
  // Landing Page methods
  async getLandingPage(id: number): Promise<LandingPage | undefined> {
    return this.landingPages.get(id);
  }
  
  async createLandingPage(organizationId: number, userId: number, page: InsertLandingPage): Promise<LandingPage> {
    const id = this.currentId++;
    const now = new Date();
    const newPage: LandingPage = {
      id,
      name: page.name,
      description: page.description || null,
      htmlContent: page.htmlContent,
      redirectUrl: page.redirectUrl || null,
      pageType: page.pageType,
      thumbnail: page.thumbnail || null,
      organizationId,
      createdById: userId,
      createdAt: now,
      updatedAt: now
    };
    this.landingPages.set(id, newPage);
    return newPage;
  }
  
  async updateLandingPage(id: number, data: Partial<LandingPage>): Promise<LandingPage | undefined> {
    const page = this.landingPages.get(id);
    if (!page) return undefined;
    
    const updatedPage = {
      ...page,
      ...data,
      updatedAt: new Date()
    };
    this.landingPages.set(id, updatedPage);
    return updatedPage;
  }
  
  async deleteLandingPage(id: number): Promise<boolean> {
    return this.landingPages.delete(id);
  }
  
  async listLandingPages(organizationId: number): Promise<LandingPage[]> {
    return Array.from(this.landingPages.values()).filter(
      (page) => page.organizationId === organizationId
    );
  }
  
  // Campaign methods
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }
  
  async createCampaign(organizationId: number, userId: number, campaign: InsertCampaign): Promise<Campaign> {
    const id = this.currentId++;
    const now = new Date();
    const newCampaign: Campaign = {
      id,
      name: campaign.name,
      status: "Draft",
      targetGroupId: Number(campaign.targetGroupId),
      smtpProfileId: Number(campaign.smtpProfileId),
      emailTemplateId: Number(campaign.emailTemplateId),
      landingPageId: Number(campaign.landingPageId),
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt) : null,
      endDate: campaign.endDate ? new Date(campaign.endDate) : null,
      createdById: userId,
      organizationId,
      createdAt: now,
      updatedAt: now
    };
    this.campaigns.set(id, newCampaign);
    return newCampaign;
  }
  
  async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedCampaign = {
      ...campaign,
      ...data,
      updatedAt: new Date()
    };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }
  
  async deleteCampaign(id: number): Promise<boolean> {
    // Delete all results associated with this campaign
    for (const [resultId, result] of this.campaignResults.entries()) {
      if (result.campaignId === id) {
        this.campaignResults.delete(resultId);
      }
    }
    return this.campaigns.delete(id);
  }
  
  async listCampaigns(organizationId: number): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter(
      (campaign) => campaign.organizationId === organizationId
    );
  }
  
  // Campaign Result methods
  async getCampaignResult(id: number): Promise<CampaignResult | undefined> {
    return this.campaignResults.get(id);
  }
  
  async createCampaignResult(organizationId: number, result: InsertCampaignResult): Promise<CampaignResult> {
    const id = this.currentId++;
    const now = new Date();
    const newResult: CampaignResult = {
      id,
      campaignId: result.campaignId,
      targetId: result.targetId,
      sent: result.sent || false,
      sentAt: result.sentAt || null,
      opened: result.opened || false,
      openedAt: result.openedAt || null,
      clicked: result.clicked || false,
      clickedAt: result.clickedAt || null,
      submitted: result.submitted || false,
      submittedAt: result.submittedAt || null,
      submittedData: result.submittedData || null,
      organizationId,
      createdAt: now,
      updatedAt: now
    };
    this.campaignResults.set(id, newResult);
    return newResult;
  }
  
  async updateCampaignResult(id: number, data: Partial<CampaignResult>): Promise<CampaignResult | undefined> {
    const result = this.campaignResults.get(id);
    if (!result) return undefined;
    
    const updatedResult = {
      ...result,
      ...data,
      updatedAt: new Date()
    };
    this.campaignResults.set(id, updatedResult);
    return updatedResult;
  }
  
  async listCampaignResults(campaignId: number): Promise<CampaignResult[]> {
    return Array.from(this.campaignResults.values()).filter(
      (result) => result.campaignId === campaignId
    );
  }
  
  // Dashboard methods
  async getDashboardStats(organizationId: number): Promise<any> {
    // Count active campaigns
    const activeCampaigns = Array.from(this.campaigns.values()).filter(
      campaign => campaign.organizationId === organizationId && campaign.status === "Active"
    ).length;
    
    // Count users
    const userCount = Array.from(this.users.values()).filter(
      user => user.organizationId === organizationId
    ).length;
    
    // In a real implementation, you would calculate more detailed metrics
    // For now, we'll return a simple mock data
    
    return {
      activeCampaigns,
      campaignChange: 12, // Mock data
      successRate: 32.8, // Mock data
      successRateChange: 5.2, // Mock data
      totalUsers: userCount,
      newUsers: 3, // Mock data
      trainingCompletion: 78, // Mock data
      trainingCompletionChange: 8, // Mock data
    };
  }
}

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
