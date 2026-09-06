const Order = require("../models/Order");
const Menu = require("../models/Menu");

// ============= HELPERS =============
const parseIntegerParam = (value) => {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
};

const isValidMonth = (month) => Number.isInteger(month) && month >= 1 && month <= 12;
const isValidTrimester = (trimester) => Number.isInteger(trimester) && trimester >= 1 && trimester <= 4;
const isValidYear = (year) => Number.isInteger(year) && year > 0 && year <= 9999;

const getDateRange = (period, customStartDate, customEndDate) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate, endDate;

  // Jika ada custom date range, gunakan itu
  if (customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
    endDate.setDate(endDate.getDate() + 1); // Include end date
    return { startDate, endDate };
  }

  // Handle period-based ranges
  const normalizedPeriod = (period || "day").toString().toLowerCase();

  switch (normalizedPeriod) {
    case "day":
    case "daily":
      startDate = new Date(startOfDay);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
      break;

    case "week":
    case "weekly":
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
      break;

    case "month":
    case "monthly":
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
      break;

    case "trimester":
    case "quarter":
      startDate = new Date(startOfDay);
      startDate.setDate(startDate.getDate() - 90);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
      break;

    case "year":
    case "yearly":
      startDate = new Date(startOfDay);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
      break;

    default:
      startDate = new Date(startOfDay);
      endDate = new Date(startOfDay);
      endDate.setDate(endDate.getDate() + 1);
  }

  return { startDate, endDate };
};

const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error("Tanggal mulai dan akhir harus diisi");
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Format tanggal tidak valid. Gunakan format YYYY-MM-DD");
  }
  
  if (start > end) {
    throw new Error("Tanggal mulai harus lebih kecil dari tanggal akhir");
  }
  
  return { start, end };
};

const buildDateRange = ({ period = "day", startDate: customStart, endDate: customEnd, month, year, trimester }) => {
  if (month && trimester) {
    throw new Error("Gunakan hanya satu jenis filter: month atau trimester");
  }

  if ((customStart && !customEnd) || (!customStart && customEnd)) {
    throw new Error("Kedua parameter startDate dan endDate harus diisi untuk filter rentang tanggal");
  }

  const normalizedPeriod = (period || "day").toString().toLowerCase();

  if (month || trimester) {
    const yearNum = parseIntegerParam(year);
    if (!isValidYear(yearNum)) {
      throw new Error("Parameter year harus angka valid");
    }

    if (month) {
      const monthNum = parseIntegerParam(month);
      if (!isValidMonth(monthNum)) {
        throw new Error("Parameter month harus angka antara 1 sampai 12");
      }

      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 0);
      end.setDate(end.getDate() + 1);

      return {
        startDate: start,
        endDate: end,
        period: normalizedPeriod,
        month: monthNum,
        year: yearNum,
        trimester: null,
      };
    }

    const trimesterNum = parseIntegerParam(trimester);
    if (!isValidTrimester(trimesterNum)) {
      throw new Error("Parameter trimester harus angka antara 1 sampai 4");
    }

    const startMonth = (trimesterNum - 1) * 3;
    const start = new Date(yearNum, startMonth, 1);
    const end = new Date(yearNum, startMonth + 2, 0);
    end.setDate(end.getDate() + 1);

    return {
      startDate: start,
      endDate: end,
      period: normalizedPeriod,
      month: null,
      year: yearNum,
      trimester: trimesterNum,
    };
  }

  if (customStart && customEnd) {
    const validated = validateDateRange(customStart, customEnd);
    const start = validated.start;
    const end = validated.end;
    end.setDate(end.getDate() + 1);

    return {
      startDate: start,
      endDate: end,
      period: normalizedPeriod,
      month: null,
      year: null,
      trimester: null,
    };
  }

  const range = getDateRange(normalizedPeriod);
  return {
    startDate: range.startDate,
    endDate: range.endDate,
    period: normalizedPeriod,
    month: null,
    year: null,
    trimester: null,
  };
};

// ============= GET BEST SELLING MENU =============
exports.getBestSellingMenu = async (req, res) => {
  try {
    const { 
      period = "day", 
      limit = 5,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    } = req.query;

    const dateRange = buildDateRange({
      period,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    });

    const {
      startDate,
      endDate,
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    } = dateRange;

    const topLimit = parseInt(limit, 10) || 5;

    console.log(`[ANALYTICS] Fetching best selling with filters:`, {
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    });
    console.log(`[ANALYTICS] Date range: ${startDate} to ${endDate}`);

    // Aggregate orders - Hanya ambil item yang BUKAN minuman dari paket
    const bestSelling = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $unwind: "$items",
      },
      // 🔥 HILANGKAN minuman dari paket
      {
        $match: {
          $or: [
            { "items.isIncludedInPackage": { $ne: true } }, // Bukan minuman paket
            { "items.parentPackageId": { $exists: false } }, // Tidak memiliki parent package
            { "items.parentPackageId": null } // Parent package null
          ]
        },
      },
      // 🔥 Juga hilangkan item dengan harga 0 (kecuali paketnya sendiri)
      {
        $match: {
          $or: [
            { "items.price": { $gt: 0 } }, // Harga lebih dari 0
            { "items.category": "Paket" } // Atau kategorinya Paket (biarpun harga 0)
          ]
        },
      },
      {
        $group: {
          _id: "$items.name",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: topLimit,
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
        },
      },
    ]);

    // Ambil harga dari collection Menu
    const menuNames = bestSelling.map(item => item.name);
    const menus = await Menu.find({ 
      name: { $in: menuNames },
      isDeleted: { $ne: true }
    }).select("name price -_id");

    // Gabungkan data
    const finalData = bestSelling.map(item => {
      const menu = menus.find(m => m.name === item.name);
      return {
        name: item.name,
        price: menu ? menu.price : 0
      };
    });

    // Filter lagi untuk memastikan tidak ada price 0 (kecuali namanya "Paket")
    const filteredData = finalData.filter(item => {
      // Jika price 0 dan bukan Paket, hilangkan
      if (item.price === 0 && !item.name.toLowerCase().includes("paket")) {
        return false;
      }
      return true;
    });

    console.log(`[ANALYTICS] Best selling result (package drinks removed):`, filteredData);

    res.json({
      success: true,
      data: filteredData,
      period: resolvedPeriod,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      filters: {
        month: monthFilter || null,
        year: yearFilter || null,
        trimester: trimesterFilter || null,
      },
      message: "Best selling menu retrieved successfully (package drinks hidden)",
    });
  } catch (err) {
    console.error("[ANALYTICS] Error in getBestSellingMenu:", err);
    const statusCode = /Parameter|Tanggal/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Gagal mengambil data menu terlaris",
      error: err.message,
    });
  }
};

// ============= GET SALES SUMMARY =============
exports.getSalesSummary = async (req, res) => {
  try {
    const { 
      period = "day",
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester
    } = req.query;

    const dateRange = buildDateRange({
      period,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    });

    const {
      startDate,
      endDate,
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    } = dateRange;

    console.log(`[ANALYTICS] Fetching sales summary with filters:`, {
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    });

    const summary = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
          totalItems: {
            $sum: {
              $size: "$items",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          avgOrderValue: { $round: ["$avgOrderValue", 2] },
          totalItems: 1,
        },
      },
    ]);

    const data = summary[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      totalItems: 0,
    };

    res.json({
      success: true,
      data,
      period: resolvedPeriod,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      filters: {
        month: monthFilter || null,
        year: yearFilter || null,
        trimester: trimesterFilter || null,
      },
      message: "Sales summary retrieved successfully",
    });
  } catch (err) {
    console.error("[ANALYTICS] Error in getSalesSummary:", err);
    const statusCode = /Parameter|Tanggal/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Gagal mengambil ringkasan penjualan",
      error: err.message,
    });
  }
};

// ============= GET ORDERS HISTORY =============
exports.getOrdersHistory = async (req, res) => {
  try {
    const { 
      period = "day", 
      startDate: customStart, 
      endDate: customEnd, 
      page = 1, 
      limit = 20,
      month,
      year,
      trimester
    } = req.query;

    const dateRange = buildDateRange({
      period,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    });

    const {
      startDate,
      endDate,
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    } = dateRange;

    console.log(`[ANALYTICS] Fetching orders history with filters:`, {
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
      page,
      limit,
    });

    const pageNum = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 20;
    const skip = (pageNum - 1) * pageSize;

    const totalCount = await Order.countDocuments({
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    const orders = await Order.find({
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalPages = Math.ceil(totalCount / pageSize);

    res.json({
      success: true,
      data: orders,
      pagination: {
        currentPage: pageNum,
        pageSize,
        totalCount,
        totalPages,
      },
      period: resolvedPeriod,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      filters: {
        month: monthFilter || null,
        year: yearFilter || null,
        trimester: trimesterFilter || null,
      },
      message: "Orders history retrieved successfully",
    });
  } catch (err) {
    console.error("[ANALYTICS] Error in getOrdersHistory:", err);
    const statusCode = /Parameter|Tanggal/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Gagal mengambil riwayat pesanan",
      error: err.message,
    });
  }
};

// ============= GET ORDER REPORT (PAID ORDERS ONLY) =============
exports.getOrderReport = async (req, res) => {
  try {
    const { 
      period = "daily",
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester
    } = req.query;

    const dateRange = buildDateRange({
      period,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    });

    const {
      startDate,
      endDate,
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    } = dateRange;

    console.log(`[ANALYTICS] Fetching paid order report with filters:`, {
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    });

    console.log(`[ANALYTICS] Fetching paid order report for period: ${period}`);

    const paidMatch = {
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
      status: "paid",
    };

    const summary = await Order.aggregate([
      { $match: paidMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
          totalItems: { $sum: { $size: "$items" } },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          avgOrderValue: { $round: ["$avgOrderValue", 2] },
          totalItems: 1,
        },
      },
    ]);

    const reportSummary = summary[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      totalItems: 0,
    };

    const bestSelling = await Order.aggregate([
      { $match: paidMatch },
      { $unwind: "$items" },
      {
        $match: {
          $or: [
            { "items.isIncludedInPackage": { $ne: true } },
            { "items.parentPackageId": { $exists: false } },
            { "items.parentPackageId": null },
          ],
        },
      },
      {
        $group: {
          _id: "$items.name",
          totalQuantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          totalQuantity: 1,
        },
      },
    ]);

    const categoryBreakdown = await Order.aggregate([
      { $match: paidMatch },
      { $unwind: "$items" },
      {
        $match: {
          $or: [
            { "items.isIncludedInPackage": { $ne: true } },
            { "items.parentPackageId": { $exists: false } },
            { "items.parentPackageId": null },
          ],
        },
      },
      {
        $group: {
          _id: "$items.category",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          quantity: 1,
          revenue: { $round: ["$revenue", 2] },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        summary: reportSummary,
        bestSelling,
        categoryBreakdown,
      },
      period: resolvedPeriod,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      filters: {
        month: monthFilter || null,
        year: yearFilter || null,
        trimester: trimesterFilter || null,
      },
      message: "Paid order report retrieved successfully",
    });
  } catch (err) {
    console.error("[ANALYTICS] Error in getOrderReport:", err);
    const statusCode = /Parameter|Tanggal/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Gagal mengambil laporan pesanan",
      error: err.message,
    });
  }
};

// ============= GET ORDERS STATISTICS =============
exports.getOrdersStats = async (req, res) => {
  try {
    const { 
      period = "day", 
      startDate: customStart, 
      endDate: customEnd,
      month,
      year,
      trimester
    } = req.query;

    const dateRange = buildDateRange({
      period,
      startDate: customStart,
      endDate: customEnd,
      month,
      year,
      trimester,
    });

    const {
      startDate,
      endDate,
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    } = dateRange;

    console.log(`[ANALYTICS] Fetching orders stats with filters:`, {
      period: resolvedPeriod,
      month: monthFilter,
      year: yearFilter,
      trimester: trimesterFilter,
    });

    console.log(`[ANALYTICS] Fetching orders stats. Date range: ${startDate} to ${endDate}`);

    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
          minOrderValue: { $min: "$totalPrice" },
          maxOrderValue: { $max: "$totalPrice" },
          totalItems: {
            $sum: {
              $size: "$items",
            },
          },
          avgItemsPerOrder: {
            $avg: {
              $size: "$items",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          avgOrderValue: { $round: ["$avgOrderValue", 2] },
          minOrderValue: { $round: ["$minOrderValue", 2] },
          maxOrderValue: { $round: ["$maxOrderValue", 2] },
          totalItems: 1,
          avgItemsPerOrder: { $round: ["$avgItemsPerOrder", 2] },
        },
      },
    ]);

    const data = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      minOrderValue: 0,
      maxOrderValue: 0,
      totalItems: 0,
      avgItemsPerOrder: 0,
    };

    const dailyBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          orders: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          orders: 1,
          revenue: { $round: ["$revenue", 2] },
        },
      },
    ]);

    // Category breakdown - HILANGKAN minuman dari paket
    const categoryBreakdown = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $unwind: "$items",
      },
      {
        $match: {
          $or: [
            { "items.isIncludedInPackage": { $ne: true } },
            { "items.parentPackageId": { $exists: false } },
            { "items.parentPackageId": null }
          ]
        },
      },
      {
        $group: {
          _id: "$items.category",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          revenue: -1,
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          quantity: 1,
          revenue: { $round: ["$revenue", 2] },
          count: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overall: data,
        dailyBreakdown,
        categoryBreakdown,
      },
      period: resolvedPeriod,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      filters: {
        month: monthFilter || null,
        year: yearFilter || null,
        trimester: trimesterFilter || null,
      },
      message: "Orders statistics retrieved successfully",
    });
  } catch (err) {
    console.error("[ANALYTICS] Error in getOrdersStats:", err);
    const statusCode = /Parameter|Tanggal/.test(err.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: "Gagal mengambil statistik pesanan",
      error: err.message,
    });
  }
};