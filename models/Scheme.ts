import mongoose from "mongoose";

const SchemeSchema = new mongoose.Schema({
    schemeId: String,
    schemeName: String,
    loanType: String,
    totalAmount: Number,
    interest: Number,
    applicationFees: Number,
    insuranceFees: Number,
    riskProductionFees: Number,
    upfrontFees: Number,
    dues: Number,
    rows: [
        {
            principal: String,
            interest: String,
            savings: String,
            total: String
        }
    ]
});

const Scheme = mongoose.models.Scheme || mongoose.model("Scheme", SchemeSchema);

if (!mongoose.models.Schema) {
    mongoose.model("Schema", SchemeSchema);
}

export default Scheme;
