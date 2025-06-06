class ProfitPredictionEngine {
  constructor(aiSystem) {
    this.aiSystem = aiSystem;
    this.profitHistory = [];
    this.predictions = [];
  }

  // 💰 Main Profit Prediction Method
  async generateProfitPredictions(daysAhead = 30) {
    console.log("💰 ========== PROFIT PREDICTION START ==========");

    const predictions = {
      daily: [],
      weekly: [],
      monthly: {},
      summary: {},
      recommendations: [],
    };

    // Calculate historical profit patterns
    const profitPatterns = this.analyzeProfitPatterns();

    // Generate daily profit predictions
    for (let day = 1; day <= daysAhead; day++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + day);

      const dailyPrediction = await this.predictDayProfit(
        futureDate,
        profitPatterns
      );
      predictions.daily.push(dailyPrediction);
    }

    // Aggregate weekly predictions
    predictions.weekly = this.aggregateWeeklyProfits(predictions.daily);

    // Calculate monthly totals
    predictions.monthly = this.aggregateMonthlyProfits(predictions.daily);

    // Generate summary and insights
    predictions.summary = this.generateProfitSummary(predictions);
    predictions.recommendations =
      this.generateProfitRecommendations(predictions);

    console.log("💰 ========== PROFIT PREDICTION COMPLETE ==========");
    return predictions;
  }

  // 📊 Analyze Historical Profit Patterns
  analyzeProfitPatterns() {
    const patterns = {
      dailyAverages: new Array(7).fill(0), // Day of week averages
      monthlyTrends: new Array(12).fill(0), // Monthly patterns
      productProfitability: {},
      seasonalFactors: {},
      overallTrend: 0,
    };

    // Calculate profit for each historical sale
    const profitData = this.aiSystem.salesHistory.map((sale) => {
      const product = this.aiSystem.products.find(
        (p) => p.produk_id === sale.produk_id
      );
      const profit = product
        ? (sale.harga - product.harga_beli) * sale.quantity
        : 0;
      const date = new Date(sale.tanggal);

      return {
        date: date,
        profit: profit,
        dayOfWeek: date.getDay(),
        month: date.getMonth(),
        productId: sale.produk_id,
        productName: sale.nama_produk,
        margin: product ? (sale.harga - product.harga_beli) / sale.harga : 0,
      };
    });

    // Analyze day-of-week patterns
    const dayTotals = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    profitData.forEach((profit) => {
      dayTotals[profit.dayOfWeek] += profit.profit;
      dayCounts[profit.dayOfWeek]++;
    });

    patterns.dailyAverages = dayTotals.map((total, i) =>
      dayCounts[i] > 0 ? total / dayCounts[i] : 0
    );

    // Analyze monthly patterns
    const monthTotals = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);

    profitData.forEach((profit) => {
      monthTotals[profit.month] += profit.profit;
      monthCounts[profit.month]++;
    });

    patterns.monthlyTrends = monthTotals.map((total, i) =>
      monthCounts[i] > 0 ? total / monthCounts[i] : 0
    );

    // Analyze product profitability
    profitData.forEach((profit) => {
      if (!patterns.productProfitability[profit.productId]) {
        patterns.productProfitability[profit.productId] = {
          totalProfit: 0,
          count: 0,
          name: profit.productName,
          avgMargin: 0,
        };
      }

      const productProfit = patterns.productProfitability[profit.productId];
      productProfit.totalProfit += profit.profit;
      productProfit.count++;
      productProfit.avgMargin = (productProfit.avgMargin + profit.margin) / 2;
    });

    // Calculate overall trend
    if (profitData.length > 30) {
      const recentProfits = profitData.slice(-30);
      const oldProfits = profitData.slice(-60, -30);

      const recentAvg =
        recentProfits.reduce((sum, p) => sum + p.profit, 0) /
        recentProfits.length;
      const oldAvg =
        oldProfits.reduce((sum, p) => sum + p.profit, 0) / oldProfits.length;

      patterns.overallTrend = oldAvg > 0 ? (recentAvg - oldAvg) / oldAvg : 0;
    }

    return patterns;
  }

  // 🔮 Predict Single Day Profit
  async predictDayProfit(date, patterns) {
    const dayOfWeek = date.getDay();
    const month = date.getMonth();

    // Base profit from day-of-week pattern
    let baseDayProfit = patterns.dailyAverages[dayOfWeek];

    // Apply monthly seasonal factor
    const monthlyFactor =
      patterns.monthlyTrends[month] /
      (patterns.monthlyTrends.reduce((sum, val) => sum + val, 0) / 12);

    // Apply overall trend
    const trendFactor = 1 + patterns.overallTrend;

    // Special day factors
    const specialFactors = this.getSpecialDayFactors(date);

    // Weather impact on frozen food sales
    const weatherFactor = await this.getWeatherProfitImpact(date);

    // Calculate predicted profit per product
    const productProfits = await this.predictProductProfits(date, patterns);

    const totalPredictedProfit =
      baseDayProfit *
      monthlyFactor *
      trendFactor *
      specialFactors.combined *
      weatherFactor;

    return {
      date: date.toISOString().split("T")[0],
      predictedProfit: Math.round(totalPredictedProfit),
      baseDayProfit: Math.round(baseDayProfit),
      factors: {
        monthly: monthlyFactor,
        trend: trendFactor,
        special: specialFactors,
        weather: weatherFactor,
      },
      productBreakdown: productProfits,
      confidence: this.calculateProfitConfidence(date, patterns),
    };
  }

  // 🎯 Predict Profits by Product
  async predictProductProfits(date, patterns) {
    const productProfits = [];

    for (const product of this.aiSystem.products) {
      const productPattern = patterns.productProfitability[product.produk_id];

      if (productPattern && productPattern.count > 5) {
        // Get predicted demand for this product
        const predictedDemand = (await this.aiSystem.predictDemandWithAI)
          ? await this.aiSystem.predictDemandWithAI(product.produk_id, 1)
          : this.aiSystem.calculateSalesVelocity(product.produk_id);

        // Calculate profit per unit
        const profitPerUnit = product.harga - product.harga_beli;
        const predictedProfit = predictedDemand * profitPerUnit;

        productProfits.push({
          productId: product.produk_id,
          productName: product.nama,
          predictedDemand: Math.round(predictedDemand),
          profitPerUnit: profitPerUnit,
          predictedProfit: Math.round(predictedProfit),
          margin: (profitPerUnit / product.harga) * 100,
          confidence: productPattern.count > 20 ? 0.8 : 0.6,
        });
      }
    }

    return productProfits.sort((a, b) => b.predictedProfit - a.predictedProfit);
  }

  // 📅 Get Special Day Factors
  getSpecialDayFactors(date) {
    const factors = {
      isWeekend: [0, 6].includes(date.getDay()) ? 1.2 : 1.0,
      isPayday: this.aiSystem.isPayday(date) ? 1.3 : 1.0,
      isHoliday: this.aiSystem.isHoliday(date) ? 1.5 : 1.0,
      isEndOfMonth: date.getDate() >= 25 ? 1.15 : 1.0,
    };

    factors.combined =
      factors.isWeekend *
      factors.isPayday *
      factors.isHoliday *
      factors.isEndOfMonth;

    return factors;
  }

  // 🌡️ Weather Impact on Profit
  async getWeatherProfitImpact(date) {
    try {
      const weatherScore = await this.aiSystem.getWeatherScore(date);
      // Higher temperature = higher frozen food demand = higher profit
      return 0.8 + weatherScore * 0.4; // Range: 0.8 - 1.2
    } catch (error) {
      return 1.0; // Neutral if weather data unavailable
    }
  }

  // 📈 Aggregate Weekly Profits
  aggregateWeeklyProfits(dailyPredictions) {
    const weeks = [];
    let currentWeek = [];
    let weekStartDate = null;

    dailyPredictions.forEach((day, index) => {
      const dayDate = new Date(day.date);

      if (currentWeek.length === 0) {
        weekStartDate = new Date(dayDate);
      }

      currentWeek.push(day);

      if (currentWeek.length === 7 || index === dailyPredictions.length - 1) {
        const weekTotal = currentWeek.reduce(
          (sum, d) => sum + d.predictedProfit,
          0
        );
        const avgConfidence =
          currentWeek.reduce((sum, d) => sum + d.confidence, 0) /
          currentWeek.length;

        weeks.push({
          weekStart: weekStartDate.toISOString().split("T")[0],
          weekEnd: dayDate.toISOString().split("T")[0],
          totalProfit: Math.round(weekTotal),
          avgDailyProfit: Math.round(weekTotal / currentWeek.length),
          confidence: avgConfidence,
          days: currentWeek.length,
          trend: this.calculateWeeklyTrend(currentWeek),
        });

        currentWeek = [];
      }
    });

    return weeks;
  }

  // 📊 Aggregate Monthly Profits
  aggregateMonthlyProfits(dailyPredictions) {
    const monthlyData = {};

    dailyPredictions.forEach((day) => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalProfit: 0,
          days: 0,
          avgDailyProfit: 0,
          bestDay: { profit: 0, date: "" },
          worstDay: { profit: Infinity, date: "" },
        };
      }

      const monthData = monthlyData[monthKey];
      monthData.totalProfit += day.predictedProfit;
      monthData.days++;

      if (day.predictedProfit > monthData.bestDay.profit) {
        monthData.bestDay = { profit: day.predictedProfit, date: day.date };
      }

      if (day.predictedProfit < monthData.worstDay.profit) {
        monthData.worstDay = { profit: day.predictedProfit, date: day.date };
      }
    });

    // Calculate averages
    Object.values(monthlyData).forEach((month) => {
      month.avgDailyProfit = Math.round(month.totalProfit / month.days);
      month.totalProfit = Math.round(month.totalProfit);
    });

    return monthlyData;
  }

  // 📋 Generate Profit Summary
  generateProfitSummary(predictions) {
    const totalPredictedProfit = predictions.daily.reduce(
      (sum, day) => sum + day.predictedProfit,
      0
    );
    const avgDailyProfit = totalPredictedProfit / predictions.daily.length;
    const bestDay = predictions.daily.reduce((best, day) =>
      day.predictedProfit > best.predictedProfit ? day : best
    );
    const worstDay = predictions.daily.reduce((worst, day) =>
      day.predictedProfit < worst.predictedProfit ? day : worst
    );

    // Calculate growth rate
    const firstWeekProfit = predictions.weekly[0]?.totalProfit || 0;
    const lastWeekProfit =
      predictions.weekly[predictions.weekly.length - 1]?.totalProfit || 0;
    const growthRate =
      firstWeekProfit > 0
        ? ((lastWeekProfit - firstWeekProfit) / firstWeekProfit) * 100
        : 0;

    return {
      totalPredictedProfit: Math.round(totalPredictedProfit),
      avgDailyProfit: Math.round(avgDailyProfit),
      avgWeeklyProfit: Math.round(
        totalPredictedProfit / predictions.weekly.length
      ),
      bestDay: {
        date: bestDay.date,
        profit: Math.round(bestDay.predictedProfit),
      },
      worstDay: {
        date: worstDay.date,
        profit: Math.round(worstDay.predictedProfit),
      },
      profitGrowthRate: Math.round(growthRate * 100) / 100,
      avgConfidence: Math.round(
        (predictions.daily.reduce((sum, day) => sum + day.confidence, 0) /
          predictions.daily.length) *
          100
      ),
      predictionPeriod: predictions.daily.length,
    };
  }

  // 💡 Generate Profit Recommendations
  generateProfitRecommendations(predictions) {
    const recommendations = [];
    const summary = predictions.summary;

    // Growth trend recommendation
    if (summary.profitGrowthRate > 5) {
      recommendations.push({
        type: "growth",
        priority: "high",
        title: "📈 Strong Growth Trend",
        message: `Profit trending upward by ${summary.profitGrowthRate}%. Consider increasing inventory for high-margin products.`,
        action: "increase_high_margin_stock",
      });
    } else if (summary.profitGrowthRate < -5) {
      recommendations.push({
        type: "decline",
        priority: "critical",
        title: "📉 Profit Decline Alert",
        message: `Profit declining by ${Math.abs(
          summary.profitGrowthRate
        )}%. Review pricing strategy and cost optimization.`,
        action: "review_pricing_strategy",
      });
    }

    // Best performing products
    const topProducts = this.getTopProfitProducts(predictions);
    if (topProducts.length > 0) {
      recommendations.push({
        type: "optimization",
        priority: "medium",
        title: "🏆 Top Profit Drivers",
        message: `${topProducts[0].productName} generating highest profits. Ensure optimal stock levels.`,
        action: "optimize_top_performers",
        data: topProducts.slice(0, 3),
      });
    }

    // Confidence level recommendations
    if (summary.avgConfidence < 70) {
      recommendations.push({
        type: "data_quality",
        priority: "medium",
        title: "⚠️ Improve Prediction Accuracy",
        message: `Prediction confidence at ${summary.avgConfidence}%. More sales data needed for better forecasts.`,
        action: "improve_data_collection",
      });
    }

    // Weekly pattern insights
    const weeklyInsights = this.analyzeWeeklyProfitPatterns(predictions.weekly);
    if (weeklyInsights.recommendations.length > 0) {
      recommendations.push(...weeklyInsights.recommendations);
    }

    return recommendations;
  }

  // 🏆 Get Top Profit Products
  getTopProfitProducts(predictions) {
    const productProfits = {};

    predictions.daily.forEach((day) => {
      day.productBreakdown.forEach((product) => {
        if (!productProfits[product.productId]) {
          productProfits[product.productId] = {
            productId: product.productId,
            productName: product.productName,
            totalPredictedProfit: 0,
            avgDailyProfit: 0,
            avgMargin: 0,
            days: 0,
          };
        }

        const productData = productProfits[product.productId];
        productData.totalPredictedProfit += product.predictedProfit;
        productData.avgMargin = (productData.avgMargin + product.margin) / 2;
        productData.days++;
      });
    });

    // Calculate averages and sort
    return Object.values(productProfits)
      .map((product) => ({
        ...product,
        avgDailyProfit: Math.round(product.totalPredictedProfit / product.days),
        totalPredictedProfit: Math.round(product.totalPredictedProfit),
      }))
      .sort((a, b) => b.totalPredictedProfit - a.totalPredictedProfit);
  }

  // 📊 Calculate Confidence
  calculateProfitConfidence(date, patterns) {
    const dayOfWeek = date.getDay();
    const historicalDataPoints = patterns.dailyAverages[dayOfWeek];

    if (historicalDataPoints === 0) return 0.3;

    // Higher confidence for more recent dates and weekdays with more data
    const daysFromNow = Math.floor((date - new Date()) / (1000 * 60 * 60 * 24));
    const timeDecay = Math.max(0.4, 1 - daysFromNow * 0.02);

    return Math.min(0.95, timeDecay * 0.8);
  }

  // 📈 Calculate Weekly Trend
  calculateWeeklyTrend(weekDays) {
    if (weekDays.length < 3) return "stable";

    const firstHalf = weekDays.slice(0, Math.floor(weekDays.length / 2));
    const secondHalf = weekDays.slice(Math.floor(weekDays.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, d) => sum + d.predictedProfit, 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, d) => sum + d.predictedProfit, 0) /
      secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 5) return "increasing";
    if (change < -5) return "decreasing";
    return "stable";
  }

  // 📅 Analyze Weekly Patterns
  analyzeWeeklyProfitPatterns(weeklyData) {
    const recommendations = [];

    if (weeklyData.length >= 2) {
      const avgWeeklyGrowth =
        weeklyData.slice(1).reduce((sum, week, index) => {
          const prevWeek = weeklyData[index];
          const growth =
            prevWeek.totalProfit > 0
              ? ((week.totalProfit - prevWeek.totalProfit) /
                  prevWeek.totalProfit) *
                100
              : 0;
          return sum + growth;
        }, 0) /
        (weeklyData.length - 1);

      if (avgWeeklyGrowth > 10) {
        recommendations.push({
          type: "weekly_growth",
          priority: "high",
          title: "🚀 Strong Weekly Growth",
          message: `Average weekly profit growth: ${avgWeeklyGrowth.toFixed(
            1
          )}%. Scale up operations.`,
          action: "scale_operations",
        });
      }
    }

    return { recommendations };
  }
}
