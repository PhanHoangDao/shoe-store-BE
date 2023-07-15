const algoliasearch = require("algoliasearch");

class algoliaService {
	configuration() {
		const client = algoliasearch(
			process.env.ALGOLIA_APP_ID,
			process.env.ALGOLIA_SEARCH_ADMIN_KEY
		);
		const index = client.initIndex("product");
		return index;
	}

	updateData(data) {
		const index = this.configuration();
		index
			.saveObjects(data)
			.then(({ objectIDs }) => {
				console.log("update data successfully", objectIDs);
			})
			.catch((err) => console.error(err));
	}

	deleteData(data) {
		const index = this.configuration();
		index
			.deleteObjects(data)
			.then(({ objectIDs }) => {
				console.log(`Object ${objectIDs[0]} has been deleted`);
			})
			.catch((err) => {
				console.error(err);
			});
	}
}

module.exports = new algoliaService();
