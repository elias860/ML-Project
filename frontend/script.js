document.addEventListener("DOMContentLoaded", function() {
    // Backend URL - using relative path to work with the deployed frontend
    const BACKEND_URL = '/api'; // This will be proxied to the backend service
    
    // Get elements for file processing
    const uploadBtn = document.getElementById("uploadBtn");
    const visualizeBtn = document.getElementById("visualizeBtn");
    const fileUpload = document.getElementById("fileUpload");
    const visualizeFileUpload = document.getElementById("visualizeFileUpload");
    const progressMessage = document.getElementById("progressMessage");

    // Get elements for login/register
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    // Check if we're on the login page
    if (loginForm || registerForm) {
        // Clear any previous login state
        localStorage.removeItem('loggedIn');
    }

    // Check if we're on the dashboard page and user is not logged in
    if (uploadBtn && !localStorage.getItem('loggedIn')) {
        window.location.href = 'index.html';
        return;
    }

    // Login functionality
    if (loginBtn) {
        loginBtn.onclick = async function() {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                showMessage('Please enter both username and password', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    showMessage('Login successful! Redirecting...', 'success', 'loginMessage');
                    localStorage.setItem('loggedIn', 'true');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage(data.error || 'Login failed', 'error', 'loginMessage');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Error connecting to server', 'error', 'loginMessage');
            }
        };
    }

    // Register functionality
    if (registerBtn) {
        registerBtn.onclick = async function() {
            const username = document.getElementById('registerUsername').value;
            const password = document.getElementById('registerPassword').value;

            if (!username || !password) {
                showMessage('Please enter both username and password', 'error');
                return;
            }

            try {
                const response = await fetch(`${BACKEND_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (response.status === 201) {
                    showMessage('Registration successful! Please login.', 'success', 'registerMessage');
                    setTimeout(() => {
                        showLoginForm();
                    }, 1500);
                } else {
                    showMessage(data.error || 'Registration failed', 'error', 'registerMessage');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showMessage('Error connecting to server', 'error', 'registerMessage');
            }
        };
    }

    // Prediction functionality
    if (uploadBtn) {
        uploadBtn.onclick = async function(event) {
            event.preventDefault();
            
            const file = fileUpload.files[0];
            if (!file) {
                showMessage("Please select a file first", "error", "predictionMessage");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            // Disable button and show progress
            uploadBtn.disabled = true;
            showMessage("Processing file...", "loading", "predictionMessage");
            if (progressMessage) {
                progressMessage.style.display = 'block';
            }

            try {
                const response = await fetch(`${BACKEND_URL}/predict`, {
                    method: "POST",
                    body: formData
                });
                
                const data = await response.json();

                if (data.status === "success") {
                    showMessage("File processed successfully! Ready for visualization.", "success", "predictionMessage");
                    localStorage.setItem('processedFileName', file.name);
                } else {
                    throw new Error(data.message || "Error processing file");
                }
            } catch (error) {
                showMessage("Error: " + error.message, "error", "predictionMessage");
                console.error("Error details:", error);
            } finally {
                uploadBtn.disabled = false;
                if (progressMessage) {
                    progressMessage.style.display = 'none';
                }
            }
        };
    }

    // Visualization functionality
    if (visualizeBtn) {
        visualizeBtn.onclick = async function(event) {
            event.preventDefault();
            
            const file = visualizeFileUpload.files[0];
            if (!file) {
                showMessage("Please select a file first", "error", "visualizeMessage");
                return;
            }

            showMessage("Generating visualizations...", "loading", "visualizeMessage");
            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch(`${BACKEND_URL}/visualization`, {
                    method: "POST",
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log("Response data:", data); // Debug log

                if (data.data) {
                    createAllCharts(data.data);
                    showMessage("Visualizations generated successfully!", "success", "visualizeMessage");
                } else {
                    throw new Error("No visualization data received");
                }
            } catch (error) {
                console.error("Visualization error:", error);
                showMessage("Error: " + error.message, "error", "visualizeMessage");
            }
        };
    }
});

// Chart creation functions
function createAllCharts(data) {
    // Clear existing charts first
    document.querySelectorAll('.chart-container > div').forEach(container => {
        container.innerHTML = '';
    });

    try {
        console.log("Received data:", data);

        if (data.risk_distribution) {
            createRiskDistributionChart(data.risk_distribution);
        }
        if (data.health_stats) {
            createHealthRiskChart(data.health_stats);
        }
        if (data.attendance_stats) {
            createAttendanceRiskChart(data.attendance_stats);
        }
        if (data.gpa_data) {
            createGPAChart(data.gpa_data);
        }
        if (data.scholarship_stats) {
            createScholarshipRiskChart(data.scholarship_stats);
        }
        if (data.gpa_data) {
            createPerformanceIndicatorChart(data);
        }
        if (data.risk_distribution) {
            createRiskTrendChart(data);
        }
        if (data.health_stats && data.attendance_stats && data.scholarship_stats) {
            createCombinedMetricsChart(data);
        }
    } catch (error) {
        console.error("Error creating charts:", error);
        showMessage("Error creating visualizations", "error", "visualizeMessage");
    }
}

function createRiskDistributionChart(riskCounts) {
    const pieData = [{
        values: Object.values(riskCounts),
        labels: Object.keys(riskCounts),
        type: 'pie',
        hole: 0.4,
        marker: {
            colors: ['#6bcb77', '#ffd93d', '#ff6b6b']
        }
    }];

    const layout = {
        title: {
            text: 'Risk Distribution',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 50, l: 50, r: 50 },
        showlegend: true,
        legend: {
            orientation: "h",
            y: -0.2,
            x: 0.5,
            xanchor: 'center'
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('riskDistribution', pieData, layout, config);
}

function createHealthRiskChart(healthStats) {
    if (!Array.isArray(healthStats)) return;

    const healthCategories = ['Critical', 'Unstable', 'Stable'];
    const riskCategories = ['High Risk', 'Moderate Risk', 'Low Risk'];
    
    const traces = riskCategories.map(risk => ({
        x: healthCategories,
        y: healthCategories.map(health => {
            const stat = healthStats.find(s => s.health === health && s.Risk === risk);
            return stat ? stat.count : 0;
        }),
        name: risk,
        type: 'bar'
    }));

    const layout = {
        title: {
            text: 'Health Status vs Risk Level',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        barmode: 'group',
        xaxis: {
            title: 'Health Status',
            titlefont: { size: 12 },
            tickangle: 0
        },
        yaxis: {
            title: 'Number of Students',
            titlefont: { size: 12 }
        },
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        },
        bargap: 0.15,
        bargroupgap: 0.1
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('healthRiskChart', traces, layout, config);
}

function createAttendanceRiskChart(attendanceStats) {
    if (!Array.isArray(attendanceStats)) return;

    const attendanceCategories = ['Poor', 'Good', 'Excellent'];
    const riskCategories = ['High Risk', 'Moderate Risk', 'Low Risk'];
    
    const traces = riskCategories.map(risk => ({
        x: attendanceCategories,
        y: attendanceCategories.map(attendance => {
            const stat = attendanceStats.find(s => s.attendance === attendance && s.Risk === risk);
            return stat ? stat.count : 0;
        }),
        name: risk,
        type: 'bar'
    }));

    const layout = {
        title: {
            text: 'Attendance vs Risk Level',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        barmode: 'group',
        xaxis: {
            title: 'Attendance',
            titlefont: { size: 12 },
            tickangle: 0
        },
        yaxis: {
            title: 'Number of Students',
            titlefont: { size: 12 }
        },
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        },
        bargap: 0.15,
        bargroupgap: 0.1
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('attendanceRiskChart', traces, layout, config);
}

function createGPAChart(gpaData) {
    if (!Array.isArray(gpaData)) return;

    const riskLevels = ['Low Risk', 'Moderate Risk', 'High Risk'];
    const colors = ['#6bcb77', '#ffd93d', '#ff6b6b'];
    
    const traces = riskLevels.map((risk, index) => ({
        x: gpaData.filter(d => d.Risk === risk).map((_, i) => i + 1),
        y: gpaData.filter(d => d.Risk === risk).map(d => d.cgpa),
        mode: 'markers',
        name: risk,
        marker: {
            size: 8,
            color: colors[index],
            opacity: 0.7
        },
        type: 'scatter'
    }));

    const layout = {
        title: {
            text: 'CGPA Distribution by Risk Level',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        xaxis: {
            title: 'Student Number',
            titlefont: { size: 12 },
            showgrid: true,
            gridcolor: '#f0f0f0',
            zeroline: false
        },
        yaxis: {
            title: 'CGPA',
            titlefont: { size: 12 },
            range: [1.5, 4.0],
            showgrid: true,
            gridcolor: '#f0f0f0'
        },
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        },
        plot_bgcolor: 'white'
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('gpaChart', traces, layout, config);
}

function createScholarshipRiskChart(scholarshipStats) {
    if (!Array.isArray(scholarshipStats)) return;

    const scholarshipCategories = ['Safe', 'Uncertain', 'Endangered'];
    const riskCategories = ['High Risk', 'Moderate Risk', 'Low Risk'];
    
    const traces = riskCategories.map(risk => ({
        x: scholarshipCategories,
        y: scholarshipCategories.map(scholarship => {
            const stat = scholarshipStats.find(s => s.scholarship === scholarship && s.Risk === risk);
            return stat ? stat.count : 0;
        }),
        name: risk,
        type: 'bar'
    }));

    const layout = {
        title: {
            text: 'Scholarship Status vs Risk Level',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        barmode: 'group',
        xaxis: {
            title: 'Scholarship Status',
            titlefont: { size: 12 },
            tickangle: 0
        },
        yaxis: {
            title: 'Number of Students',
            titlefont: { size: 12 }
        },
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        },
        bargap: 0.15,
        bargroupgap: 0.1
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('scholarshipRiskChart', traces, layout, config);
}

function createPerformanceIndicatorChart(data) {
    const riskLevels = ['High Risk', 'Moderate Risk', 'Low Risk'];
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77'];

    const traces = [{
        type: 'box',
        y: data.gpa_data.filter(d => d.Risk === 'High Risk').map(d => d.cgpa),
        name: 'High Risk',
        marker: { color: colors[0] }
    }, {
        type: 'box',
        y: data.gpa_data.filter(d => d.Risk === 'Moderate Risk').map(d => d.cgpa),
        name: 'Moderate Risk',
        marker: { color: colors[1] }
    }, {
        type: 'box',
        y: data.gpa_data.filter(d => d.Risk === 'Low Risk').map(d => d.cgpa),
        name: 'Low Risk',
        marker: { color: colors[2] }
    }];

    const layout = {
        title: {
            text: 'GPA Distribution by Risk Level',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        yaxis: {
            title: 'CGPA',
            range: [1.5, 4.0],
            titlefont: { size: 12 }
        },
        xaxis: {
            title: 'Risk Level',
            titlefont: { size: 12 }
        },
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        },
        boxmode: 'group'
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('performanceIndicatorChart', traces, layout, config);
}

function createRiskTrendChart(data) {
    const trace = {
        x: Object.keys(data.risk_distribution),
        y: Object.values(data.risk_distribution),
        type: 'scatter',
        mode: 'lines+markers',
        line: {
            color: '#1a73e8',
            width: 3
        },
        marker: {
            size: 8
        }
    };

    const layout = {
        title: {
            text: 'Risk Level Distribution Trend',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        xaxis: {
            title: 'Risk Level',
            titlefont: { size: 12 }
        },
        yaxis: {
            title: 'Number of Students',
            titlefont: { size: 12 }
        },
        showlegend: false
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('riskTrendChart', [trace], layout, config);
}

function createCombinedMetricsChart(data) {
    const metrics = ['Health', 'Attendance', 'Scholarship'];
    const riskLevels = ['High Risk', 'Moderate Risk', 'Low Risk'];
    
    const traces = metrics.map(metric => ({
        type: 'scatterpolar',
        name: metric,
        r: riskLevels.map(risk => {
            const stats = data[`${metric.toLowerCase()}_stats`];
            return stats ? stats.filter(s => s.Risk === risk).length : 0;
        }),
        theta: riskLevels,
        fill: 'toself'
    }));

    const layout = {
        title: {
            text: 'Combined Risk Metrics Analysis',
            y: 0.95
        },
        height: 300,
        margin: { t: 40, b: 80, l: 60, r: 50 },
        polar: {
            radialaxis: {
                visible: true,
                range: [0, Math.max(...traces.map(t => Math.max(...t.r)))]
            }
        },
        showlegend: true,
        legend: {
            orientation: "h",
            y: -0.3,
            x: 0.5,
            xanchor: 'center'
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('combinedMetricsChart', traces, layout, config);
}

function showMessage(message, type, elementId = 'message') {
    const messageDiv = document.getElementById(elementId);
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
    }
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm && registerForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm && registerForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('loggedIn');
    window.location.href = 'index.html';
}

// Add a window resize handler to make charts responsive
window.addEventListener('resize', function() {
    const chartDivs = document.querySelectorAll('.chart-container > div');
    chartDivs.forEach(div => {
        if (div.data) {
            Plotly.Plots.resize(div);
        }
    });
});
