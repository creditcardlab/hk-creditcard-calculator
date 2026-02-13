// js/data_conversions.js

const conversionDB = [
    { src: "HSBC_RC_EM", miles_rate: 20, cash_rate: 1 },
    { src: "HSBC_RC", miles_rate: 10, cash_rate: 1 },
    { src: "AM_Direct", miles_rate: 1, cash_rate: 0 },
    { src: "CASH_Direct", miles_rate: 0, cash_rate: 1 },
    { src: "DBS_Black_Points", miles_rate: 1, cash_rate: 0.1 },
    { src: "Fun_Dollars", miles_rate: 0, cash_rate: 1 },
    { src: "CITI_PM_PTS", miles_rate: 1 / 12, cash_rate: 0.004 }, // 12分=1里
    { src: "CITI_R_PTS", miles_rate: 1 / 15, cash_rate: 0.004 },  // 15分=1里
    { src: "CLUB_PTS", miles_rate: 0, cash_rate: 0.2 },
    { src: "YUU_Points", miles_rate: 0, cash_rate: 0.005 },
    { src: "DBS_Dollar", miles_rate: 1000 / 48, cash_rate: 1 }, // DBS Black: $48 = 1000 Miles
    { src: "DBS_Dollar_Others", miles_rate: 1000 / 72, cash_rate: 1 }, // Eminent/Live Fresh: $72 = 1000 Miles
    { src: "COMPASS_Dollar", miles_rate: 10, cash_rate: 1 }   // $100 = 1000 Miles => $1 = 10 Miles
];
// BOC Points conversion
const bocPointsConversion = { src: "BOC_Points", miles_rate: 1 / 15, cash_rate: 0.004 }; // 15分=1里 | 250分=$1 (Updated to std rate)
conversionDB.push(bocPointsConversion);// BOC Points added
conversionDB.push({ src: "AE_MR", miles_rate: 1 / 18, cash_rate: 1 / 300 }); // 18分=1里 | 300分=$1
conversionDB.push({ src: "Fubon_Points", miles_rate: 1 / 15, cash_rate: 1 / 200 }); // Visa Infinite: 15分=1里 | 200分=$1
conversionDB.push({ src: "Fubon_Points_Std", miles_rate: 1 / 15, cash_rate: 1 / 250 }); // iN / Visa白金: 15分=1里 | 250分=$1
conversionDB.push({ src: "BEA_Points", miles_rate: 0, cash_rate: 1 / 250 }); // 250分=$1
conversionDB.push({ src: "BEA_iDollar", miles_rate: 0, cash_rate: 1 }); // i-Dollar = $1
