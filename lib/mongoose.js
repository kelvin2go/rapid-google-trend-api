const { MongoClient } = require('mongodb');

const USERNAME = process.env.MONGOOSE_USER;
const PASSWORD = process.env.MONGOOSE_PASSWORD;
const DATABASE = process.env.MONGOOSE_DATABASE || 'gt';
const DB_URL = process.env.MONGOOSE_DB_URL;

const uri = `mongodb+srv://${USERNAME}:${PASSWORD}@${DB_URL}/${DATABASE}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const MONGO = {
    getRecords: async (query, sort = null, _collection = 'daily2') => {
        try {
            const options = {};
            if (sort) {
                options.sort = sort;
            }
            const collection = client.db(DATABASE).collection(_collection);
            const records = await collection.find(query, options).toArray();
            return records;
        } catch (err) {
            console.error('Error getting data from MongoDB:', err);
        }
    },
    createRecords: async (records, _collection = 'daily2') => {
        if (!records) return;
        try {
            const collection = client.db(DATABASE).collection(_collection);
            const result = await collection.insertMany(records);
            console.log('Data saved:', result.insertedCount);
        } catch (err) {
            console.error('Error saving data to MongoDB:', err);
        }
    },
    deleteRecordsByDate: async (query, _collection = 'daily2') => {
        try {
            const collection = client.db(DATABASE).collection(_collection);
            // console.log(collection);
            await collection.deleteMany(query, function (err, result) {
                if (err) {
                    console.error('Error deleting documents:', err);
                }
                console.log('Documents deleted successfully:', result.deletedCount);
            });
        } catch (err) {
            console.error('Error saving data to MongoDB:', err);
        }
    },
};
module.exports = MONGO;
