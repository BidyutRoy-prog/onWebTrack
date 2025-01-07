// Initialize the chart
var chartDom = document.getElementById('monthlyDayByDayChart');
var myChart = echarts.init(chartDom);
var option;

// Function to get the current month's data from storage
function getMonthlyData(callback) {
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let daysInMonth = new Date(year, month, 0).getDate();
    let monthlyData = {};
    let days = [];

    for (let day = 1; day <= daysInMonth; day++) {
        let date = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
        days.push(date);
        monthlyData[date] = {};
    }

    chrome.storage.local.get(null, function (data) {
        days.forEach((day) => {
            if (data[day]) {
                for (let domain in data[day]) {
                    if (!monthlyData[day][domain]) {
                        monthlyData[day][domain] = 0;
                    }
                    monthlyData[day][domain] += data[day][domain];
                }
            }
        });
        callback(monthlyData, days);
    });
}

// Function to convert seconds into a human-readable string
function secondsToString(seconds) {
    let hours = parseInt(seconds / 3600);
    seconds = seconds % 3600;
    let minutes = parseInt(seconds / 60);
    seconds = seconds % 60;
    let timeString = "";
    if (hours) {
        timeString += hours + " h";
    }
    if (minutes) {
        timeString += minutes + " m";
    }
    if (seconds) {
        timeString += seconds + " s";
    }
    return timeString;
}

// Fetch the data and render the chart
getMonthlyData(function (data, days) {
    let seriesData = [];
    let websites = new Set();

    days.forEach(day => {
        for (let domain in data[day]) {
            websites.add(domain);
        }
    });

    websites = Array.from(websites);

    websites.forEach(website => {
        let values = [];
        days.forEach(day => {
            values.push(data[day][website] || 0);
        });
        seriesData.push({
            name: website,
            type: 'bar',
            stack: 'total',
            emphasis: {
                focus: 'series'
            },
            data: values
        });
    });

    option = {
        title: {
            text: 'Most Used Websites - Daily Comparison for the Current Month',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: function (params) {
                let result = params[0].axisValue + '<br/>';
                params.forEach(item => {
                    result += item.marker + item.seriesName + ': ' + secondsToString(item.value) + '<br/>';
                });
                return result;
            }
        },
        // legend: {
        //     data: websites,
        //     top: 'bottom'
        // },
        xAxis: {
            type: 'category',
            data: days,
            axisLabel: {
                rotate: 45,
                interval: 0
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function (value) {
                    return secondsToString(value);
                }
            }
        },
        series: seriesData,
        animationDuration: 3000,
        animationEasing: 'linear',
        animationEasingUpdate: 'linear'
    };

    // Set the option and render the chart
    myChart.setOption(option);
});
