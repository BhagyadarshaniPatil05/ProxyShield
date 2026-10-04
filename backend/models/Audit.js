const storageService = require('../services/storageService');

class AuditModel {
  static async create(data) {
    return storageService.createAudit(data);
  }

  static async find() {
    const audits = await storageService.getAllAudits();
    return {
      populate: () => ({
        sort: () => audits,
        then: (resolve) => resolve(audits)
      }),
      sort: () => audits,
      then: (resolve) => resolve(audits)
    };
  }

  static async findById(id) {
    const audit = await storageService.getAuditById(id);
    if (!audit) return null;
    audit.populate = async () => audit;
    audit.select = async () => audit;
    return audit;
  }

  static async findOne() {
    return {
      sort: () => ({
        populate: async () => {
          const all = await storageService.getAllAudits();
          if (all.length === 0) return null;
          return storageService.getAuditById(all[0]._id || all[0].id);
        },
        then: async (resolve) => {
          const all = await storageService.getAllAudits();
          resolve(all.length > 0 ? all[0] : null);
        }
      })
    };
  }

  static async deleteOne(query) {
    const id = query?._id || query?.id;
    return storageService.deleteAudit(id);
  }
}

module.exports = AuditModel;
