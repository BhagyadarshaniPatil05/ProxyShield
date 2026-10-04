// User model (legacy stub for future auth if needed)
class User {
  constructor(data = {}) {
    this.username = data.username;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role || 'auditor';
    this.createdAt = data.createdAt || new Date();
  }
}

module.exports = User;
