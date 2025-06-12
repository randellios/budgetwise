let budget = {
  income: {
    employment: 2500,
    freelance: 400 // average of 200-600 range
  },
  expenses: {
    rent: 1200,
    utilities: 150,
    insurance: 150,
    groceries: 300,
    transport: 250,
    entertainment: 192,
    virtualfund: 150
  },
  goals: {
    emergency: 300,
    debt: 208,
    holiday: 150
  }
};

// Original budget for reset functionality
const originalBudget = JSON.parse(JSON.stringify(budget));

// Goal targets and rates for calculations
const goalData = {
  emergency: { target: 5000, rate: 0 },
  debt: { target: 1500, rate: 19.9, isDebt: true },
  holiday: { target: 2000, rate: 0 }
};

function updateBudgetItem(slider) {
  const item = slider.dataset.item;
  const value = parseInt(slider.value);
  const amountElement = slider
    .closest('.budget-item')
    .querySelector('.item-amount');

  // Update the display
  amountElement.textContent = `£${value.toLocaleString()}`;

  // Update budget data
  if (budget.expenses[item] !== undefined) {
    budget.expenses[item] = value;
  } else if (budget.goals[item] !== undefined) {
    budget.goals[item] = value;
  }

  // Recalculate everything
  updateAllTotals();
  updateImpact();
  updateTimeline();
}

function updateAllTotals() {
  // Calculate totals
  const totalIncome = Object.values(budget.income).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalExpenses = Object.values(budget.expenses).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalGoals = Object.values(budget.goals).reduce(
    (sum, val) => sum + val,
    0
  );
  const surplus = totalIncome - totalExpenses - totalGoals;

  // Update main section totals
  document.getElementById('income-total').textContent =
    `£${totalIncome.toLocaleString()}`;
  document.getElementById('expenses-total').textContent =
    `£${totalExpenses.toLocaleString()}`;
  document.getElementById('goals-total').textContent =
    `£${totalGoals.toLocaleString()}`;

  // Update category totals
  const essentialsTotal =
    budget.expenses.rent +
    (budget.expenses.utilities || 0) +
    (budget.expenses.insurance || 0);
  const basicsTotal = budget.expenses.groceries + budget.expenses.transport;
  const wantsTotal = budget.expenses.entertainment;

  document.getElementById('essentials-total').textContent =
    `£${essentialsTotal.toLocaleString()}`;
  document.getElementById('basics-total').textContent =
    `£${basicsTotal.toLocaleString()}`;
  document.getElementById('wants-total').textContent =
    `£${wantsTotal.toLocaleString()}`;
  document.getElementById('virtualfund-category-total').textContent =
    `£${budget.expenses.virtualfund.toLocaleString()}`;

  // Update sidebar
  document.getElementById('sidebar-income').textContent =
    `£${totalIncome.toLocaleString()}`;
  document.getElementById('sidebar-expenses').textContent =
    `£${totalExpenses.toLocaleString()}`;
  document.getElementById('sidebar-goals').textContent =
    `£${totalGoals.toLocaleString()}`;
  document.getElementById('sidebar-surplus').textContent =
    `£${surplus.toLocaleString()}`;

  // Update allocation progress
  updateAllocationProgress(totalIncome, totalExpenses, totalGoals);

  // Update 50/30/20 rule
  update503020Rule(
    totalIncome,
    essentialsTotal,
    basicsTotal,
    wantsTotal,
    totalGoals
  );

  // Update debt freedom and saving funds
  updateDebtFreedom();
  updateSavingFunds(totalGoals);
}

function updateAllocationProgress(totalIncome, totalExpenses, totalGoals) {
  const totalAllocated = totalExpenses + totalGoals;
  const allocationPercentage = Math.round((totalAllocated / totalIncome) * 100);

  // Update percentage display
  document.getElementById('allocationPercentage').textContent =
    `${allocationPercentage}%`;

  // Update figures
  document.getElementById('allocationFigures').innerHTML = `
          <div class="allocated-amount">£${totalAllocated.toLocaleString()}</div>
          <div class="total-income">of £${totalIncome.toLocaleString()}</div>
        `;

  // Update circular progress
  const degrees = (allocationPercentage / 100) * 360;
  const circle = document.getElementById('allocationCircle');
  circle.style.background = `conic-gradient(#10b981 0deg ${degrees}deg, #e2e8f0 ${degrees}deg 360deg)`;
}

function updateDebtFreedom() {
  const debtAllocation = budget.goals.debt;
  if (debtAllocation === 0) {
    document.getElementById('debt-freedom-value').textContent = 'Paused';
    document.getElementById('debt-freedom-change').textContent = 'No payments';
    document.getElementById('debt-freedom-change').className =
      'impact-change-text negative';
    return;
  }

  const calc = calculateGoalTimeline('debt');
  document.getElementById('debt-freedom-value').textContent = calc.timeline;

  // Calculate change from original
  const originalCalc = calculateOriginalTimeline('debt');
  const change = originalCalc - calc.months;
  const changeElement = document.getElementById('debt-freedom-change');

  if (change > 0) {
    changeElement.textContent = `${change} months faster`;
    changeElement.className = 'impact-change-text positive';
  } else if (change < 0) {
    changeElement.textContent = `${Math.abs(change)} months slower`;
    changeElement.className = 'impact-change-text negative';
  } else {
    changeElement.textContent = 'On track';
    changeElement.className = 'impact-change-text neutral';
  }
}

function updateSavingFunds(totalGoals) {
  // Calculate total savings allocation (excluding debt payments)
  const savingsTotal = budget.goals.emergency + budget.goals.holiday;

  document.getElementById('saving-funds-value').textContent =
    `£${savingsTotal.toLocaleString()}`;

  // Calculate change from original
  const originalSavings =
    originalBudget.goals.emergency + originalBudget.goals.holiday;
  const change = savingsTotal - originalSavings;
  const changeElement = document.getElementById('saving-funds-change');

  if (change > 0) {
    changeElement.textContent = `+£${change} increase`;
    changeElement.className = 'impact-change-text positive';
  } else if (change < 0) {
    changeElement.textContent = `-£${Math.abs(change)} decrease`;
    changeElement.className = 'impact-change-text negative';
  } else {
    changeElement.textContent = 'Per month';
    changeElement.className = 'impact-change-text neutral';
  }
}

function update503020Rule(
  totalIncome,
  essentialsTotal,
  basicsTotal,
  wantsTotal,
  totalGoals
) {
  // Calculate percentages
  const needsTotal = essentialsTotal + basicsTotal; // Essential needs
  const wantsPercent = Math.round((wantsTotal / totalIncome) * 100);
  const needsPercent = Math.round((needsTotal / totalIncome) * 100);
  const savingsPercent = Math.round((totalGoals / totalIncome) * 100);

  // Update progress bars
  document.getElementById('needsFill').style.width = `${needsPercent}%`;
  document.getElementById('wantsFill').style.width = `${wantsPercent}%`;
  document.getElementById('savingsFill').style.width = `${savingsPercent}%`;

  // Update percentages
  document.getElementById('needsPercentage').textContent = `${needsPercent}%`;
  document.getElementById('wantsPercentage').textContent = `${wantsPercent}%`;
  document.getElementById('savingsPercentage').textContent =
    `${savingsPercent}%`;

  // Update status
  const statusElement = document.getElementById('ruleStatus');
  const statusIcon = statusElement.querySelector('.status-icon');
  const statusText = statusElement.querySelector('.status-text');

  // Determine status
  let status = 'good';
  let message = '';
  let icon = '✅';

  if (needsPercent > 60) {
    status = 'danger';
    icon = '⚠️';
    message =
      'Your needs are consuming too much income. Consider reducing essential expenses.';
  } else if (wantsPercent > 35) {
    status = 'warning';
    icon = '⚡';
    message =
      'Your wants spending is high. Consider reducing discretionary expenses.';
  } else if (savingsPercent < 15) {
    status = 'warning';
    icon = '💡';
    message =
      'Consider increasing your savings rate for better financial security.';
  } else if (savingsPercent >= 20) {
    status = 'good';
    icon = '🎯';
    message = "Excellent! You're exceeding the recommended 20% savings rate.";
  } else {
    status = 'good';
    icon = '✅';
    message = 'Good balance! Your budget aligns well with the 50/30/20 rule.';
  }

  // Apply status styling
  statusElement.className = `rule-status ${status === 'good' ? '' : status}`;
  statusIcon.textContent = icon;
  statusText.textContent = message;
}

function calculateGoalTimeline(goalKey) {
  const allocation = budget.goals[goalKey];
  const data = goalData[goalKey];

  if (allocation === 0) return { months: 999, timeline: 'Paused' };

  let months;
  if (data.isDebt && data.rate > 0) {
    // Debt payoff with interest
    const monthlyRate = data.rate / 100 / 12;
    const currentBalance = data.target;
    months = Math.ceil(
      Math.log(1 + (currentBalance * monthlyRate) / allocation) /
        Math.log(1 + monthlyRate)
    );
  } else {
    // Simple target savings
    months = Math.ceil(data.target / allocation);
  }

  const date = new Date();
  date.setMonth(date.getMonth() + months);
  const timeline = date.toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric'
  });

  return { months, timeline };
}

function updateTimeline() {
  // Calculate new timelines
  const holidayCalc = calculateGoalTimeline('holiday');
  const debtCalc = calculateGoalTimeline('debt');
  const emergencyCalc = calculateGoalTimeline('emergency');

  // Update main timeline
  document.getElementById('holiday-timeline').textContent =
    holidayCalc.timeline;
  document.getElementById('debt-timeline').textContent = debtCalc.timeline;
  document.getElementById('emergency-timeline').textContent =
    emergencyCalc.timeline;

  // Update sidebar preview
  document.getElementById('preview-holiday').textContent = holidayCalc.timeline;
  document.getElementById('preview-debt').textContent = debtCalc.timeline;
  document.getElementById('preview-emergency').textContent =
    emergencyCalc.timeline;

  // Calculate average timeline for impact metrics
  const activeGoals = [holidayCalc, debtCalc, emergencyCalc].filter(
    (calc) => calc.months < 999
  );
  const avgMonths =
    activeGoals.length > 0
      ? Math.round(
          activeGoals.reduce((sum, calc) => sum + calc.months, 0) /
            activeGoals.length
        )
      : 0;
}

function calculateOriginalTimeline(goalKey) {
  const allocation = originalBudget.goals[goalKey];
  const data = goalData[goalKey];

  if (data.isDebt && data.rate > 0) {
    const monthlyRate = data.rate / 100 / 12;
    return Math.ceil(
      Math.log(1 + (data.target * monthlyRate) / allocation) /
        Math.log(1 + monthlyRate)
    );
  }
  return Math.ceil(data.target / allocation);
}

function updateImpact() {
  // Update emergency buffer
  const totalExpenses = Object.values(budget.expenses).reduce(
    (sum, val) => sum + val,
    0
  );
  const bufferMonths = (budget.expenses.virtualfund * 12) / totalExpenses;
  document.getElementById('buffer-value').textContent =
    `${bufferMonths.toFixed(1)} months`;

  const bufferChangeElement = document.getElementById('buffer-change');
  const originalBuffer =
    (originalBudget.expenses.virtualfund * 12) /
    Object.values(originalBudget.expenses).reduce((sum, val) => sum + val, 0);
  const bufferChange = bufferMonths - originalBuffer;

  if (bufferChange > 0.1) {
    bufferChangeElement.textContent = `+${bufferChange.toFixed(1)} months`;
    bufferChangeElement.className = 'impact-change-text positive';
  } else if (bufferChange < -0.1) {
    bufferChangeElement.textContent = `${bufferChange.toFixed(1)} months`;
    bufferChangeElement.className = 'impact-change-text negative';
  } else {
    bufferChangeElement.textContent = 'Secure';
    bufferChangeElement.className = 'impact-change-text neutral';
  }

  // Update sidebar buffer preview
  const totalIncome = Object.values(budget.income).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalGoals = Object.values(budget.goals).reduce(
    (sum, val) => sum + val,
    0
  );
  const newSurplus =
    totalIncome -
    Object.values(budget.expenses).reduce((sum, val) => sum + val, 0) -
    totalGoals;
  document.getElementById('preview-buffer').textContent = `£${newSurplus}`;
}

function resetBudget() {
  // Reset budget to original values
  budget = JSON.parse(JSON.stringify(originalBudget));

  // Reset all sliders
  document.querySelectorAll('.budget-slider').forEach((slider) => {
    const item = slider.dataset.item;
    if (budget.expenses[item] !== undefined) {
      slider.value = budget.expenses[item];
    } else if (budget.goals[item] !== undefined) {
      slider.value = budget.goals[item];
    }

    // Update amount display
    const amountElement = slider
      .closest('.budget-item')
      .querySelector('.item-amount');
    amountElement.textContent = `£${slider.value}`;
  });

  // Update all calculations
  updateAllTotals();
  updateImpact();
  updateTimeline();
}

function saveBudget() {
  // In a real app, this would save to a backend
  alert(
    'Budget changes saved successfully! 🎉\n\nYour updated budget is now active and will be reflected in your dashboard and projections.'
  );
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  updateAllTotals();
  updateImpact();
  updateTimeline();
});
