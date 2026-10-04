const storageService = require('../services/storageService');

class DatasetModel {
  static async create(data) {
    return storageService.createDataset(data);
  }

  static async find() {
    const datasets = await storageService.getAllDatasets();
    return {
      select: () => ({
        sort: () => datasets
      }),
      sort: () => datasets,
      then: (resolve) => resolve(datasets)
    };
  }

  static async findById(id) {
    return storageService.getDatasetById(id);
  }

  static async deleteOne(query) {
    const id = query?._id || query?.id;
    return storageService.deleteDataset(id);
  }
}

module.exports = DatasetModel;