const splitName = (name) => {
  if (!name) {
    return { firstName: '', lastName: '' };
  }
  const parts = name.trim().split(/\s+/);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');
  return { firstName, lastName };
};

const toIso = (value) => (value ? new Date(value).toISOString() : null);

module.exports = { splitName, toIso };
