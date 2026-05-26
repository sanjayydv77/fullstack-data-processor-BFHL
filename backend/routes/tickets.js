const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const { addDerivedFields } = require('../utils/slaHelper');

// Status hierarchy for transitions
const STATUS_ORDER = {
  open: 0,
  in_progress: 1,
  resolved: 2,
  closed: 3
};

/**
 * @route   POST /tickets
 * @desc    Create a support ticket
 */
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;

    // Upfront explicit validation
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return res.status(400).json({ error: "subject is required and must be a non-empty string" });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: "description is required and must be a non-empty string" });
    }
    if (!customerEmail) {
      return res.status(400).json({ error: "customerEmail is required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: "customerEmail is not a valid email format" });
    }
    if (!priority) {
      return res.status(400).json({ error: "priority is required" });
    }
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: "priority must be one of 'low', 'medium', 'high', 'urgent'" });
    }

    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority
    });

    await ticket.save();
    res.status(201).json(addDerivedFields(ticket));
  } catch (err) {
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

/**
 * @route   GET /tickets/stats
 * @desc    Get ticket stats: counts by status, priority, and open SLA-breached
 * Note: Must be placed BEFORE GET /tickets/:id to prevent matching id as 'stats'
 */
router.get('/stats', async (req, res) => {
  try {
    const tickets = await Ticket.find({});
    const enriched = tickets.map(addDerivedFields);

    const statusCounts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    };

    let openSlaBreachedCount = 0;

    enriched.forEach(t => {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
      if (t.status === 'open' && t.slaBreached) {
        openSlaBreachedCount++;
      }
    });

    res.json({
      statusCounts,
      priorityCounts,
      openSlaBreachedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

/**
 * @route   GET /tickets
 * @desc    List tickets with status, priority, and breached query filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    const query = {};

    if (status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
        return res.status(400).json({ error: "Invalid status query filter" });
      }
      query.status = status;
    }

    if (priority) {
      if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: "Invalid priority query filter" });
      }
      query.priority = priority;
    }

    const tickets = await Ticket.find(query);
    let enriched = tickets.map(addDerivedFields);

    if (breached === 'true') {
      enriched = enriched.filter(t => t.slaBreached);
    } else if (breached === 'false') {
      enriched = enriched.filter(t => !t.slaBreached);
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

/**
 * @route   PATCH /tickets/:id
 * @desc    Update a ticket's status adhering to strict transition rules
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status: newStatus } = req.body;

    if (!newStatus) {
      return res.status(400).json({ error: "status is required in request body" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const currentIdx = STATUS_ORDER[ticket.status];
    const newIdx = STATUS_ORDER[newStatus];

    if (newIdx === undefined) {
      return res.status(400).json({ error: `Invalid status: '${newStatus}'. Must be one of: open, in_progress, resolved, closed` });
    }

    if (newStatus !== ticket.status) {
      const diff = newIdx - currentIdx;
      // Strict rule: Only forward/backward 1 step allowed
      if (Math.abs(diff) !== 1) {
        return res.status(400).json({
          error: `Invalid status transition from '${ticket.status}' to '${newStatus}'. You can only move forward or backward exactly 1 step (Status path: open -> in_progress -> resolved -> closed).`
        });
      }
    }

    // Apply specific resolvedAt changes
    if (newStatus === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (ticket.status === 'resolved' && newStatus === 'in_progress') {
      ticket.resolvedAt = null;
    }

    ticket.status = newStatus;
    await ticket.save();

    res.json(addDerivedFields(ticket));
  } catch (err) {
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

/**
 * @route   DELETE /tickets/:id
 * @desc    Delete a ticket
 */
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    res.json({ message: "Ticket deleted successfully", ticket: addDerivedFields(ticket) });
  } catch (err) {
    res.status(500).json({ error: err.message || "Server Error" });
  }
});

module.exports = router;
