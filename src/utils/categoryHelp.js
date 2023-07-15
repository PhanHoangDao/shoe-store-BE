const CateType = require("../app/models/categoryType.model");

module.exports = {
	setUpLabels: (reqQuery) => {
		switch (reqQuery) {
			case "size": {
				return { label1: "Size US/UK", label2: "Size Vietnam" };
			}
			default: {
				return { label1: "Name", label2: "Description" };
			}
		}
	},

	getCateSizeAndColor: async (arrayCategory) => {
		let listSize = [],
			listColor = [],
			cateType;

		for (typeId in arrayCategory) {
			if (Number(arrayCategory[typeId][0].cateName)) {
				listSize = arrayCategory[typeId];
				delete arrayCategory[typeId];
			}

			cateType = await CateType.findOne({ _id: typeId });

			if (cateType.type === "color") {
				listColor = arrayCategory[typeId];
				delete arrayCategory[typeId];
			}
		}

		return { listSize, listColor };
	},

	sortSize: (listSize) => {
		return listSize.sort((a, b) => a.cateName - b.cateName);
	},
};
