const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const cron = require('node-cron');

const Lead = require('../models/Lead.model');
const BuilderProfile = require('../models/Property/BuilderProfile.model');
const Project = require('../models/Property/Project.model');
const Unit = require('../models/Property/Unit.model');
const User = require('../models/User.model');

const { authenticate, authorizeRoles } = require('../middleware/auth');

async function checkExists(id, model) {
  if (!id) return true;
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  const exists = await model.exists({ _id: id });
  return !!exists;
}

// POST /api/leads/auto
router.post('/auto', authenticate, async (req, res) => {
  try {
    const { unitId } = req.body;
    const user = req.user;

    if (!unitId || !mongoose.Types.ObjectId.isValid(unitId)) {
      return res.status(400).json({ error: 'Valid unitId is required' });
    }

    // Optional: check if unit exists
    const unitExists = await Unit.exists({ _id: unitId });
    if (!unitExists) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    const lead = await Lead.create({
      user: user._id,
      userName: user.name,
      userEmail: user.email || '',
      userPhone: user.phone || '',
      interestedIn: {
        unit: unitId,
      },
      source: 'website',
      status: 'new',
      initialPaymentDone: false,
      bookingPageVisited: true,
    });

    res.status(201).json({ message: 'Lead created automatically', lead });
  } catch (err) {
    console.error('Auto-lead error:', err);
    res.status(500).json({ error: 'Failed to create lead', details: err.message });
  }
});


// Create a new lead
router.post('/', authenticate, async (req, res) => {
  try {
    const leadData = req.body;

    const builderExists = await checkExists(leadData.interestedIn?.builder, BuilderProfile);
    if (!builderExists) return res.status(400).json({ error: 'Invalid builder ID' });

    const projectExists = await checkExists(leadData.interestedIn?.project, Project);
    if (!projectExists) return res.status(400).json({ error: 'Invalid project ID' });

    const unitExists = await checkExists(leadData.interestedIn?.unit, Unit);
    if (!unitExists) return res.status(400).json({ error: 'Invalid unit ID' });

    const assignedToExists = await checkExists(leadData.assignedTo, User);
    if (!assignedToExists) return res.status(400).json({ error: 'Invalid assignedTo user ID' });

    if (leadData.notes && leadData.notes.length) {
      for (const note of leadData.notes) {
        const addedByExists = await checkExists(note.addedBy, User);
        if (!addedByExists) return res.status(400).json({ error: `Invalid note addedBy user ID (${note.addedBy})` });
      }
    }

    leadData.createdBy = req.user._id;
    const createdByExists = await checkExists(leadData.createdBy, User);
    if (!createdByExists) return res.status(400).json({ error: 'Invalid createdBy user ID' });

    // Phone is mandatory and not from login, so validate it here
  if (!leadData.userPhone) return res.status(400).json({ error: 'Phone number is required' });

    const newLead = new Lead(leadData);
    await newLead.save();

    res.status(201).json(newLead);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Get lead by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lead ID' });
    }

    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('interestedIn.builder', 'companyName')
      .populate('interestedIn.project', 'projectName')
      .populate('interestedIn.unit', 'unitNumber');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all leads (admin)
router.get('/', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate('assignedTo', 'name email role')
      .populate('interestedIn.builder', 'companyName')
      .populate('interestedIn.project', 'projectName')
      .populate('interestedIn.unit', 'unitNumber');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Get leads assigned to logged-in directBuilder
router.get('/assigned/:id', async (req, res) => {
  try {
    const assignedToId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(assignedToId)) {
      return res.status(400).json({ error: 'Invalid assignedTo ID' });
    }

    const leads = await Lead.find({ assignedTo: assignedToId })
      .populate('assignedTo', 'name email')
      .populate('interestedIn.builder', 'companyName')
      .populate('interestedIn.project', 'projectName')
      .populate('interestedIn.unit', 'unitNumber');

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get leads created by logged-in user
router.get('/my-leads', authenticate, authorizeRoles('user'), async (req, res) => {
  try {
    const leads = await Lead.find({ createdBy: req.user._id })
      .populate('assignedTo', 'name email')
      .populate('interestedIn.builder', 'companyName')
      .populate('interestedIn.project', 'projectName')
      .populate('interestedIn.unit', 'unitNumber');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update lead (status, notes, assignTo etc.) — admin, superAdmin, directBuilder (if assigned)
router.put('/:id', authenticate, authorizeRoles('admin', 'superAdmin', 'directBuilder'), async (req, res) => {
  try {
    const leadId = req.params.id;
    const updateData = req.body;

    if (req.user.role === 'directBuilder') {
      const lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.assignedTo?.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Not authorized to update this lead' });
    }

    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, { new: true });
    if (!updatedLead) return res.status(404).json({ error: 'Lead not found' });
    res.json(updatedLead);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete lead - admin only
router.delete('/:id', authenticate, authorizeRoles('admin', 'superAdmin','directBuilder'), async (req, res) => {
  try {
    const leadId = req.params.id;
    const deletedLead = await Lead.findByIdAndDelete(leadId);
    if (!deletedLead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark lead as hot (payment done) or cold (payment not done)
router.put('/:id/mark-payment', authenticate, authorizeRoles('admin', 'superAdmin', 'directBuilder'), async (req, res) => {
  try {
    const leadId = req.params.id;
    const { paymentDone } = req.body; // boolean

    if (typeof paymentDone !== 'boolean') return res.status(400).json({ error: 'paymentDone boolean required' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // directBuilder can only update own leads
    if (req.user.role === 'directBuilder' && lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this lead' });
    }

    lead.initialPaymentDone = paymentDone;
    lead.status = paymentDone ? 'converted' : 'new'; // example logic
    await lead.save();

    res.json({ message: `Lead marked as ${paymentDone ? 'hot' : 'cold'}`, lead });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Send reminder for cold leads (simplified example)
router.post('/reminders/send', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    // Here you'd integrate with SMS/email service, just a stub:
    const coldLeads = await Lead.find({ initialPaymentDone: false });

    // For example, print or log reminders sent
    coldLeads.forEach(lead => {
      console.log(`Reminder sent to ${lead.phone} for lead ${lead._id}`);
      // TODO: integrate SMS/email sending service here
    });

    res.json({ message: `Reminders sent to ${coldLeads.length} cold leads.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lead dashboard analytics with filters
router.get('/dashboard', authenticate, authorizeRoles('admin', 'superAdmin'), async (req, res) => {
  try {
    const { startDate, endDate, projectId, agentId } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (projectId) filter['interestedIn.project'] = projectId;
    if (agentId) filter.assignedTo = agentId;

    const totalLeads = await Lead.countDocuments(filter);
    const hotLeads = await Lead.countDocuments({ ...filter, initialPaymentDone: true });
    const coldLeads = await Lead.countDocuments({ ...filter, initialPaymentDone: false });

    const leadsPerAgent = await Lead.aggregate([
      { $match: filter },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      { $unwind: '$agent' },
      {
        $project: {
          agentName: '$agent.name',
          count: 1
        }
      }
    ]);

    res.json({ totalLeads, hotLeads, coldLeads, leadsPerAgent });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// --- Cron Job for automatic cold lead reassignment ---

cron.schedule('0 0 * * *', async () => { // every day at midnight
  try {
    console.log('Running scheduled cold lead reassignment...');
    const coldLeads = await Lead.find({ initialPaymentDone: false, status: { $ne: 'converted' } });
    const agents = await User.find({ role: { $in: ['admin', 'directBuilder'] } });

    if (!agents.length) {
      console.log('No agents available for reassignment');
      return;
    }

    for (const lead of coldLeads) {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      lead.assignedTo = randomAgent._id;
      await lead.save();
    }

    console.log(`Reassigned ${coldLeads.length} cold leads.`);
  } catch (error) {
    console.error('Error during cold lead reassignment:', error);
  }
});

module.exports = router;
