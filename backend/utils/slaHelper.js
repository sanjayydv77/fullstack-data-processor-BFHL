const SLA_TARGETS = {
  urgent: 60,     // 1 hour
  high: 240,      // 4 hours
  medium: 1440,   // 24 hours
  low: 4320       // 72 hours
};

/**
 * Calculates and attaches derived fields: ageMinutes and slaBreached.
 * @param {Object} ticketDoc - Mongoose document or plain object
 * @returns {Object} Plain object with derived fields added
 */
function addDerivedFields(ticketDoc) {
  // If it's a Mongoose document, convert to a plain JS object
  const ticket = ticketDoc.toObject ? ticketDoc.toObject() : { ...ticketDoc };
  
  const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : new Date();
  const status = ticket.status;
  const priority = ticket.priority;
  
  let endTime;
  if ((status === 'resolved' || status === 'closed') && ticket.resolvedAt) {
    endTime = new Date(ticket.resolvedAt);
  } else {
    endTime = new Date();
  }
  
  // Calculate difference in minutes
  const ageMinutes = Math.floor((endTime - createdAt) / 60000);
  
  // Fetch threshold; default to Infinity if unknown priority
  const targetSla = SLA_TARGETS[priority] || Infinity;
  const slaBreached = ageMinutes > targetSla;
  
  return {
    ...ticket,
    ageMinutes,
    slaBreached
  };
}

module.exports = {
  SLA_TARGETS,
  addDerivedFields
};
