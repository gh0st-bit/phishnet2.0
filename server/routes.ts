import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import multer from "multer";
import Papa from "papaparse";
import { insertGroupSchema, insertTargetSchema, insertSmtpProfileSchema, insertEmailTemplateSchema, insertLandingPageSchema, insertCampaignSchema } from "@shared/schema";
import { z } from "zod";

// Set up file upload middleware
const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // API Health Check
  app.get("/api/status", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Dashboard Stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.organizationId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });

  // Dashboard Metrics (Mock data for chart)
  app.get("/api/dashboard/metrics", isAuthenticated, (req, res) => {
    // Provide mock data for the phishing success rate chart
    const data = [
      { date: "Jan", rate: 42 },
      { date: "Feb", rate: 38 },
      { date: "Mar", rate: 45 },
      { date: "Apr", rate: 39 },
      { date: "May", rate: 33 },
      { date: "Jun", rate: 28 },
      { date: "Jul", rate: 32 },
    ];
    res.json(data);
  });

  // Dashboard Threat Data
  app.get("/api/dashboard/threats", isAuthenticated, (req, res) => {
    // Provide mock threat data
    const threats = [
      {
        id: 1,
        name: "Credential Phishing",
        description: "Recent campaigns target Microsoft 365 users with fake login pages.",
        level: "high"
      },
      {
        id: 2,
        name: "Invoice Fraud",
        description: "Finance departments targeted with fake invoice attachments containing malware.",
        level: "medium"
      },
      {
        id: 3,
        name: "CEO Fraud",
        description: "Impersonation attacks requesting urgent wire transfers or gift card purchases.",
        level: "medium"
      }
    ];
    res.json(threats);
  });

  // Dashboard Risk Users
  app.get("/api/dashboard/risk-users", isAuthenticated, (req, res) => {
    // Provide mock risk user data
    const users = [
      {
        id: 1,
        name: "Mike Miller",
        department: "Finance Department",
        riskLevel: "High Risk"
      },
      {
        id: 2,
        name: "Sarah Johnson",
        department: "Marketing Team",
        riskLevel: "Medium Risk"
      },
      {
        id: 3,
        name: "Tom Parker",
        department: "Executive Team",
        riskLevel: "Medium Risk"
      }
    ];
    res.json(users);
  });

  // Dashboard Training Data
  app.get("/api/dashboard/training", isAuthenticated, (req, res) => {
    // Provide mock training data
    const trainings = [
      {
        id: 1,
        name: "Phishing Awareness",
        progress: 65,
        icon: "shield"
      },
      {
        id: 2,
        name: "Password Security",
        progress: 82,
        icon: "lock"
      },
      {
        id: 3,
        name: "Mobile Device Security",
        progress: 43,
        icon: "smartphone"
      }
    ];
    res.json(trainings);
  });

  // Recent Campaigns
  app.get("/api/campaigns/recent", isAuthenticated, async (req, res) => {
    try {
      const campaigns = await storage.listCampaigns(req.user.organizationId);
      // Sort by created date and take the most recent 5
      const recentCampaigns = campaigns
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          openRate: Math.floor(Math.random() * 100), // Mock data
          clickRate: Math.floor(Math.random() * 70), // Mock data
          createdAt: campaign.createdAt
        }));
      res.json(recentCampaigns);
    } catch (error) {
      res.status(500).json({ message: "Error fetching recent campaigns" });
    }
  });

  // Groups Endpoints
  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const groups = await storage.listGroups(req.user.organizationId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Error fetching groups" });
    }
  });

  app.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(req.user.organizationId, validatedData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating group" });
    }
  });

  app.put("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Ensure user has access to this group
      if (group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertGroupSchema.parse(req.body);
      const updatedGroup = await storage.updateGroup(groupId, validatedData);
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating group" });
    }
  });

  app.delete("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Ensure user has access to this group
      if (group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteGroup(groupId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting group" });
    }
  });

  // Targets Endpoints
  app.get("/api/groups/:id/targets", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Ensure user has access to this group
      if (group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const targets = await storage.listTargets(groupId);
      res.json(targets);
    } catch (error) {
      res.status(500).json({ message: "Error fetching targets" });
    }
  });

  app.post("/api/groups/:id/targets", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Ensure user has access to this group
      if (group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget(req.user.organizationId, groupId, validatedData);
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating target" });
    }
  });

  app.post("/api/groups/:id/import", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Ensure user has access to this group
      if (group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const csvString = req.file.buffer.toString();
      const results = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      
      if (results.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: results.errors });
      }
      
      const importedTargets = [];
      const errors = [];
      
      for (const [index, row] of results.data.entries()) {
        try {
          // Normalize field names
          const normalizedRow: any = {};
          for (const [key, value] of Object.entries(row)) {
            const lowercaseKey = key.toLowerCase();
            if (lowercaseKey === 'firstname' || lowercaseKey === 'first_name') {
              normalizedRow.firstName = value;
            } else if (lowercaseKey === 'lastname' || lowercaseKey === 'last_name') {
              normalizedRow.lastName = value;
            } else if (lowercaseKey === 'email') {
              normalizedRow.email = value;
            } else if (lowercaseKey === 'position' || lowercaseKey === 'title') {
              normalizedRow.position = value;
            }
          }
          
          // Validate the data
          const validatedData = insertTargetSchema.parse(normalizedRow);
          
          // Create the target
          const target = await storage.createTarget(req.user.organizationId, groupId, validatedData);
          importedTargets.push(target);
        } catch (error) {
          errors.push({
            row: index + 2, // +2 to account for 0-based index and header row
            error: error instanceof z.ZodError ? error.errors : "Unknown error"
          });
        }
      }
      
      res.status(200).json({
        imported: importedTargets.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      res.status(500).json({ message: "Error importing targets" });
    }
  });

  // SMTP Profiles Endpoints
  app.get("/api/smtp-profiles", isAuthenticated, async (req, res) => {
    try {
      const profiles = await storage.listSmtpProfiles(req.user.organizationId);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Error fetching SMTP profiles" });
    }
  });

  app.post("/api/smtp-profiles", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSmtpProfileSchema.parse(req.body);
      const profile = await storage.createSmtpProfile(req.user.organizationId, validatedData);
      res.status(201).json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating SMTP profile" });
    }
  });

  // Email Templates Endpoints
  app.get("/api/email-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.listEmailTemplates(req.user.organizationId);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching email templates" });
    }
  });

  app.post("/api/email-templates", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(req.user.organizationId, req.user.id, validatedData);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating email template" });
    }
  });

  app.put("/api/email-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      // Ensure user has access to this template
      if (template.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertEmailTemplateSchema.parse(req.body);
      const updatedTemplate = await storage.updateEmailTemplate(templateId, validatedData);
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error updating email template" });
    }
  });

  // Landing Pages Endpoints
  app.get("/api/landing-pages", isAuthenticated, async (req, res) => {
    try {
      const pages = await storage.listLandingPages(req.user.organizationId);
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching landing pages" });
    }
  });

  app.post("/api/landing-pages", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLandingPageSchema.parse(req.body);
      const page = await storage.createLandingPage(req.user.organizationId, req.user.id, validatedData);
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating landing page" });
    }
  });

  // Campaigns Endpoints
  app.get("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const campaignList = await storage.listCampaigns(req.user.organizationId);
      
      // Include group names and other related data
      const campaigns = [];
      for (const campaign of campaignList) {
        const group = await storage.getGroup(campaign.targetGroupId);
        const targets = await storage.listTargets(campaign.targetGroupId);
        
        campaigns.push({
          ...campaign,
          targetGroup: group?.name || "Unknown",
          totalTargets: targets.length,
          sentCount: 0, // In a real app, calculate this from results
          openRate: Math.floor(Math.random() * 100), // Mock data
          clickRate: Math.floor(Math.random() * 70), // Mock data
        });
      }
      
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Error fetching campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      
      // Ensure user has access to the referenced resources
      const group = await storage.getGroup(Number(validatedData.targetGroupId));
      if (!group || group.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied: Invalid target group" });
      }
      
      const smtpProfile = await storage.getSmtpProfile(Number(validatedData.smtpProfileId));
      if (!smtpProfile || smtpProfile.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied: Invalid SMTP profile" });
      }
      
      const emailTemplate = await storage.getEmailTemplate(Number(validatedData.emailTemplateId));
      if (!emailTemplate || emailTemplate.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied: Invalid email template" });
      }
      
      const landingPage = await storage.getLandingPage(Number(validatedData.landingPageId));
      if (!landingPage || landingPage.organizationId !== req.user.organizationId) {
        return res.status(403).json({ message: "Access denied: Invalid landing page" });
      }
      
      const campaign = await storage.createCampaign(req.user.organizationId, req.user.id, validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating campaign" });
    }
  });

  // Users Endpoints
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.listUsers(req.user.organizationId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
