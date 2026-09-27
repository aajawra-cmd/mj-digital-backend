discountPrice: { type: Number, default: null },
stock: { type: Number, default: 0 },
detailedDescription: { type: String, default: '' },
specifications: [
  {
    key: { type: String },
    value: { type: String }
  }
]