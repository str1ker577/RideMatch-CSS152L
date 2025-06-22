// Global variables
let currentAffordabilityData = [];
let maxAffordablePrice = 0;

// Precision helper function to handle floating point arithmetic
function preciseCalculation(callback) {
    const originalToFixed = Number.prototype.toFixed;
    try {
        return callback();
    } finally {
        Number.prototype.toFixed = originalToFixed;
    }
}

// More precise loan calculation with proper rounding
function calculatePresentValue(monthlyPayment, monthlyRate, numPayments) {
    if (monthlyRate === 0) {
        return monthlyPayment * numPayments;
    }
    
    const factor = Math.pow(1 + monthlyRate, -numPayments);
    const numerator = 1 - factor;
    const denominator = monthlyRate;
    
    return monthlyPayment * (numerator / denominator);
}

// Price Calculator Function with Enhanced Precision
function calculateAffordability() {
    console.log("Calculating affordability with enhanced precision...");
    
    // Get input values
    const monthlyIncome = parseFloat(document.getElementById("monthly-income").value) || 0;
    const totalSavings = parseFloat(document.getElementById("total-savings").value) || 0;
    const downPaymentPercent = parseFloat(document.getElementById("down-payment").value) || 20;
    const interestRate = parseFloat(document.getElementById("interest-rate").value) || 6.5;
    const loanTermYears = parseInt(document.getElementById("loan-term").value) || 5;
    const incomeRatio = parseFloat(document.getElementById("income-ratio").value) || 30;
    
    console.log("Input values:", {
        monthlyIncome,
        totalSavings,
        downPaymentPercent,
        interestRate,
        loanTermYears,
        incomeRatio
    });
    
    // Validation
    if (monthlyIncome <= 0 && totalSavings <= 0) {
        alert("Please enter either your monthly income or total savings.");
        return;
    }
    
    let maxCarPrice = 0;
    let calculationMethod = "";
    let loanBasedPrice = 0;
    let savingsBasedPrice = 0;
    let calculationDetails = {};
    
    // Method 1: Based on Monthly Income (Loan Calculation)
    if (monthlyIncome > 0) {
        const maxMonthlyPayment = (monthlyIncome * incomeRatio) / 100;
        const monthlyInterestRate = (interestRate / 100) / 12;
        const totalPayments = loanTermYears * 12;
        
        let maxLoanAmount = 0;
        
        if (monthlyInterestRate > 0) {
            maxLoanAmount = calculatePresentValue(maxMonthlyPayment, monthlyInterestRate, totalPayments);
        } else {
            maxLoanAmount = maxMonthlyPayment * totalPayments;
        }
        
        const downPaymentDecimal = downPaymentPercent / 100;
        loanBasedPrice = maxLoanAmount / (1 - downPaymentDecimal);
        
        calculationDetails.income = {
            maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
            monthlyInterestRate: monthlyInterestRate,
            totalPayments: totalPayments,
            maxLoanAmount: Math.round(maxLoanAmount * 100) / 100,
            downPaymentAmount: Math.round((loanBasedPrice * downPaymentDecimal) * 100) / 100,
            totalCarPrice: Math.round(loanBasedPrice * 100) / 100
        };
    }
    
    // Method 2: Based on Total Savings
    if (totalSavings > 0) {
        if (monthlyIncome > 0) {
            savingsBasedPrice = totalSavings / (downPaymentPercent / 100);
            calculationDetails.savings = {
                totalSavings: totalSavings,
                downPaymentPercent: downPaymentPercent,
                maxCarPrice: Math.round(savingsBasedPrice * 100) / 100
            };
        } else {
            savingsBasedPrice = totalSavings;
            calculationDetails.savings = {
                totalSavings: totalSavings,
                paymentMethod: "cash",
                maxCarPrice: savingsBasedPrice
            };
        }
    }
    
    // Determine final max car price and method
    const roundedLoanPrice = Math.round(loanBasedPrice * 100) / 100;
    const roundedSavingsPrice = Math.round(savingsBasedPrice * 100) / 100;
    
    if (roundedLoanPrice > 0 && roundedSavingsPrice > 0) {
        if (roundedSavingsPrice <= roundedLoanPrice) {
            maxCarPrice = roundedSavingsPrice;
            calculationMethod = "savings_limited";
        } else {
            maxCarPrice = roundedLoanPrice;
            calculationMethod = "loan";
        }
    } else if (roundedLoanPrice > 0) {
        maxCarPrice = roundedLoanPrice;
        calculationMethod = "loan";
    } else if (roundedSavingsPrice > 0) {
        maxCarPrice = roundedSavingsPrice;
        calculationMethod = monthlyIncome > 0 ? "savings_limited" : "cash";
    }
    
    // Store the max affordable price globally
    maxAffordablePrice = maxCarPrice;
    
    console.log("Final calculation:", {
        loanBasedPrice: roundedLoanPrice,
        savingsBasedPrice: roundedSavingsPrice,
        maxCarPrice: maxCarPrice,
        calculationMethod: calculationMethod,
        details: calculationDetails
    });
    
    // Display results
    displayAffordabilityResults(maxCarPrice, calculationMethod, {
        monthlyIncome,
        totalSavings,
        downPaymentPercent,
        interestRate,
        loanTermYears,
        incomeRatio,
        loanBasedPrice: roundedLoanPrice,
        savingsBasedPrice: roundedSavingsPrice,
        calculationDetails
    });
    
    // Filter and display cars
    filterCarsByAffordability(maxCarPrice);
}

// Display calculation results
function displayAffordabilityResults(maxPrice, method, inputs) {
    const resultsDiv = document.getElementById("calculator-results");
    
    if (!resultsDiv) {
        console.error("Calculator results div not found");
        return;
    }
    
    let methodText = "";
    let additionalInfo = "";
    let limitingFactor = "";
    
    if (method === "loan") {
        const details = inputs.calculationDetails.income;
        methodText = `Based on your monthly income of ₱${inputs.monthlyIncome.toLocaleString()}`;
        additionalInfo = `
            <div class="calc-detail">
                <strong>Maximum Monthly Payment:</strong> ₱${details.maxMonthlyPayment.toLocaleString()}
            </div>
            <div class="calc-detail">
                <strong>Loan Amount:</strong> ₱${details.maxLoanAmount.toLocaleString()}
            </div>
            <div class="calc-detail">
                <strong>Down Payment Needed:</strong> ₱${details.downPaymentAmount.toLocaleString()} (${inputs.downPaymentPercent}%)
            </div>
            <div class="calc-detail">
                <strong>Loan Term:</strong> ${inputs.loanTermYears} years at ${inputs.interestRate}% interest
            </div>
        `;
        
        if (inputs.totalSavings > 0 && inputs.savingsBasedPrice < inputs.loanBasedPrice) {
            limitingFactor = `<div class="limiting-factor">⚠️ Limited by available savings for down payment</div>`;
        }
        
    } else if (method === "savings_limited") {
        const downPaymentAmount = maxPrice * (inputs.downPaymentPercent / 100);
        const loanAmount = maxPrice - downPaymentAmount;
        const monthlyPayment = calculateMonthlyPayment(loanAmount, inputs.interestRate, inputs.loanTermYears);
        const maxMonthlyPayment = (inputs.monthlyIncome * inputs.incomeRatio) / 100;
        
        methodText = `Limited by your available savings of ₱${inputs.totalSavings.toLocaleString()} for down payment`;
        additionalInfo = `
            <div class="calc-detail">
                <strong>Down Payment Required:</strong> ₱${Math.round(inputs.totalSavings * 100) / 100} (${inputs.downPaymentPercent}% of total price)
            </div>
            <div class="calc-detail">
                <strong>Loan Amount:</strong> ₱${Math.round(loanAmount * 100) / 100}
            </div>
            <div class="calc-detail">
                <strong>Monthly Payment:</strong> ₱${Math.round(monthlyPayment * 100) / 100}
            </div>
            <div class="calc-detail">
                <strong>Your Monthly Payment Capacity:</strong> ₱${Math.round(maxMonthlyPayment * 100) / 100}
            </div>
        `;
        
        if (monthlyPayment > maxMonthlyPayment) {
            additionalInfo += `<div class="warning">⚠️ Monthly payment exceeds your capacity by ₱${Math.round((monthlyPayment - maxMonthlyPayment) * 100) / 100}</div>`;
        }
        
    } else if (method === "cash") {
        methodText = `Based on your total savings of ₱${inputs.totalSavings.toLocaleString()}`;
        additionalInfo = `<div class="calc-detail"><strong>Payment Method:</strong> Cash Purchase</div>`;
    }
    
    resultsDiv.innerHTML = `
        <div class="affordability-result">
            <h3>💰 Affordability Calculator Results</h3>
            <div class="main-result">
                <strong>Maximum Car Price You Can Afford:</strong>
                <span class="price-highlight">₱${Math.round(maxPrice * 100) / 100}</span>
            </div>
            <div class="calculation-method">
                ${methodText}
            </div>
            ${limitingFactor}
            ${additionalInfo}
            <div class="comparison-info">
                ${inputs.loanBasedPrice > 0 && inputs.savingsBasedPrice > 0 ? 
                    `<small>
                        Income-based limit: ₱${Math.round(inputs.loanBasedPrice * 100) / 100} | 
                        Savings-based limit: ₱${Math.round(inputs.savingsBasedPrice * 100) / 100}
                    </small>` : ''
                }
            </div>
            <div class="action-buttons">
                <button onclick="showAffordableCars(${maxPrice})" class="view-cars-btn">
                    View Affordable Cars
                </button>
                <button onclick="resetCalculator()" class="reset-calc-btn">
                    Reset Calculator
                </button>
            </div>
        </div>
    `;
    
    resultsDiv.style.display = "block";
}

// Helper function to calculate monthly payment
function calculateMonthlyPayment(loanAmount, annualRate, years) {
    const monthlyRate = (annualRate / 100) / 12;
    const numPayments = years * 12;
    
    if (monthlyRate === 0) {
        return loanAmount / numPayments;
    }
    
    const factor = Math.pow(1 + monthlyRate, numPayments);
    const monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
    
    return Math.round(monthlyPayment * 100) / 100;
}

// Filter cars by affordability and display in simplified table
async function filterCarsByAffordability(maxPrice) {
    console.log(`Filtering cars with max price: ₱${maxPrice.toLocaleString()}`);
    
    try {
        const carsData = await fetchCarsData(maxPrice);
        
        if (carsData.length === 0) {
            alert("No cars found within your budget. Try adjusting your parameters or consider a higher budget.");
            return;
        }
        
        // Add affordability analysis to each car
        const carsWithAffordability = carsData.map(car => {
            const carPrice = parseFloat(car.price);
            const affordability = calculateAffordabilityStatus(carPrice, maxPrice);
            
            return {
                ...car,
                affordabilityStatus: affordability.status,
                affordabilityText: affordability.text,
                affordabilityClass: affordability.class
            };
        });
        
        // Store data globally for sorting
        currentAffordabilityData = carsWithAffordability;
        
        // Display the cars
        displayAffordableCars(carsWithAffordability);
        
        // Show the results frame
        const resultsFrame = document.getElementById("affordability-results-frame");
        if (resultsFrame) {
            resultsFrame.style.display = "block";
            resultsFrame.classList.add("visible");
            
            // Scroll to results after a short delay
            setTimeout(() => {
                resultsFrame.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
        
    } catch (error) {
        console.error("🚨 Error fetching affordable cars:", error);
        alert("An error occurred while fetching affordable cars. Please try again later.");
    }
}

// Updated fetch function for your Flask API
async function fetchCarsData(maxPrice) {
    try {
        // Use your new affordability endpoint
        const url = `/get_affordable_cars?max_price=${maxPrice}&include_stretch=true`;
        
        console.log("📤 Sending affordability request to:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log("📥 Received affordable cars data:", data);
        
        return data;
        
    } catch (error) {
        console.error("🚨 Error fetching affordable cars:", error);
        throw error;
    }
}

// Calculate affordability status for each car
function calculateAffordabilityStatus(carPrice, maxAffordablePrice) {
    const priceRatio = carPrice / maxAffordablePrice;
    
    if (carPrice <= maxAffordablePrice * 0.8) {
        return {
            status: "excellent",
            text: "Excellent Choice",
            class: "affordability-excellent"
        };
    } else if (carPrice <= maxAffordablePrice * 0.95) {
        return {
            status: "comfortable",
            text: "Comfortable",
            class: "affordability-comfortable"
        };
    } else if (carPrice <= maxAffordablePrice) {
        return {
            status: "tight",
            text: "Tight Budget",
            class: "affordability-tight"
        };
    } else if (carPrice <= maxAffordablePrice * 1.15) {
        return {
            status: "stretch",
            text: "Stretch Budget",
            class: "affordability-stretch"
        };
    } else {
        return null; // Don't include cars that are too expensive
    }
}

// Display affordable cars in the simplified table
function displayAffordableCars(carsData) {
    const tableBody = document.getElementById("affordability-car-specs");
    
    if (!tableBody) {
        console.error("Affordability table body not found");
        return;
    }
    
    // Clear existing content
    tableBody.innerHTML = "";
    
    // Filter out cars that are too expensive (null affordability)
    const affordableCars = carsData.filter(car => car.affordabilityStatus !== null);
    
    if (affordableCars.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    No cars found within your budget range.
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    affordableCars.forEach(car => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td>${car.brand || 'N/A'}</td>
            <td>${car.model || 'N/A'}</td>
            <td>${car.variant || 'N/A'}</td>
            <td>${car.fuel_type || 'N/A'}</td>
            <td>₱${parseFloat(car.price).toLocaleString()}</td>
            <td>
                <span class="${car.affordabilityClass}">
                    ${car.affordabilityText}
                </span>
            </td>
            <td></td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log(`Displayed ${affordableCars.length} affordable cars`);
}

// Show affordable cars (called from results button)
function showAffordableCars(maxPrice) {
    const resultsFrame = document.getElementById("affordability-results-frame");
    
    if (resultsFrame && resultsFrame.style.display === "block") {
        resultsFrame.scrollIntoView({ behavior: 'smooth' });
    } else {
        filterCarsByAffordability(maxPrice);
    }
}

// Reset calculator form
function resetCalculator() {
    // Reset all input fields
    document.getElementById("monthly-income").value = "";
    document.getElementById("total-savings").value = "";
    document.getElementById("down-payment").value = "20";
    document.getElementById("interest-rate").value = "6.5";
    document.getElementById("loan-term").value = "5";
    document.getElementById("income-ratio").value = "30";
    
    // Hide results
    const resultsDiv = document.getElementById("calculator-results");
    if (resultsDiv) {
        resultsDiv.style.display = "none";
        resultsDiv.innerHTML = "";
    }
    
    // Clear affordability results
    const affordabilityFrame = document.getElementById("affordability-results-frame");
    if (affordabilityFrame) {
        affordabilityFrame.style.display = "none";
        affordabilityFrame.classList.remove("visible");
    }
    
    // Clear data
    currentAffordabilityData = [];
    maxAffordablePrice = 0;
    const resultsBody = document.getElementById("affordability-car-specs");
    if (resultsBody) {
        resultsBody.innerHTML = "";
    }
    
    console.log("Calculator reset successfully");
}

// Refresh affordability results
function refreshAffordabilityResults() {
    if (maxAffordablePrice > 0) {
        filterCarsByAffordability(maxAffordablePrice);
    }
}

// Sorting functions for affordability table
function sortAffordabilityBy(criteria) {
    if (currentAffordabilityData.length === 0) return;
    
    let sortedData = [...currentAffordabilityData];
    
    switch (criteria) {
        case 'price-asc':
            sortedData.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
        case 'price-desc':
            sortedData.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
        case 'affordability-best':
            const affordabilityOrder = ['excellent', 'comfortable', 'tight', 'stretch'];
            sortedData.sort((a, b) => {
                return affordabilityOrder.indexOf(a.affordabilityStatus) - affordabilityOrder.indexOf(b.affordabilityStatus);
            });
            break;
        case 'affordability-stretch':
            const reverseAffordabilityOrder = ['stretch', 'tight', 'comfortable', 'excellent'];
            sortedData.sort((a, b) => {
                return reverseAffordabilityOrder.indexOf(a.affordabilityStatus) - reverseAffordabilityOrder.indexOf(b.affordabilityStatus);
            });
            break;
        case 'brand-asc':
            sortedData.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
            break;
        case 'brand-desc':
            sortedData.sort((a, b) => (b.brand || '').localeCompare(a.brand || ''));
            break;
    }
    
    displayAffordableCars(sortedData);
    
    // Close dropdown
    const dropdown = document.querySelector('#affordabilitySortDropdown .dropdown-menu');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Toggle affordability dropdown
function toggleAffordabilityDropdown() {
    const dropdown = document.querySelector('#affordabilitySortDropdown .dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('affordabilitySortDropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        const menu = dropdown.querySelector('.dropdown-menu');
        if (menu) {
            menu.classList.remove('show');
        }
    }
});

// Debounce function to prevent too many calculations
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optional: Show live preview of affordability
function updateCalculationPreview() {
    const monthlyIncome = parseFloat(document.getElementById("monthly-income").value) || 0;
    const incomeRatio = parseFloat(document.getElementById("income-ratio").value) || 30;
    
    if (monthlyIncome > 0) {
        const maxMonthlyPayment = (monthlyIncome * incomeRatio) / 100;
        const previewDiv = document.getElementById("calculation-preview");
        
        if (previewDiv) {
            previewDiv.innerHTML = `
                <small>Preview: Max monthly payment ≈ ₱${maxMonthlyPayment.toLocaleString()}</small>
            `;
        }
    }
}

// Setup event listeners
function setupCalculatorListeners() {
    const inputs = [
        "monthly-income",
        "total-savings", 
        "down-payment",
        "interest-rate",
        "loan-term",
        "income-ratio"
    ];
    
    inputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener("input", debounce(updateCalculationPreview, 500));
        }
    });
}

// Initialize calculator when DOM loads
document.addEventListener("DOMContentLoaded", function () {
    setupCalculatorListeners();
    
    const calculatorForm = document.getElementById("price-calculator-form");
    if (calculatorForm) {
        resetCalculator();
    }
    
    console.log("Car Affordability Calculator initialized");
});