// Initialize the chart
var chartDom = document.getElementById('monthlyChart');
var myChart = echarts.init(chartDom);
var option;

// Function to get the current month's data from storage
function getMonthlyData(callback) {
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth() + 1;
    let daysInMonth = new Date(year, month, 0).getDate();
    let monthlyData = [];
    let days = [];

    for (let day = 1; day <= daysInMonth; day++) {
        let date = `${year}-${month < 10 ? '0' + month : month}-${day < 10 ? '0' + day : day}`;
        days.push(date);
        monthlyData.push({ day: date, value: 0 });
    }

    chrome.storage.local.get(null, function (data) {
        days.forEach((day, index) => {
            if (data[day]) {
                let totalTime = 0;
                for (let domain in data[day]) {
                    totalTime += data[day][domain];
                }
                monthlyData[index].value = totalTime;
            }
        });
        callback(monthlyData);
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
        timeString += hours + " h ";
    }
    if (minutes) {
        timeString += minutes + " m ";
    }
    if (seconds) {
        timeString += seconds + " s";
    }
    return timeString;
}

// Fetch the data and render the chart
getMonthlyData(function (data) {
    var days = data.map(item => item.day);
    var values = data.map(item => item.value);

    option = {
        title: {
            text: 'Daily Usage Data for the Current Month',
            left: 'center'
        },
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
        series: [{
            type: 'bar',
            data: values,
            label: {
                show: true,
                position: 'top',
                formatter: function (params) {
                    return secondsToString(params.value);
                }
            },
            itemStyle: {
                color: '#007bff'
            }
        }],
        animationDuration: 3000,
        animationEasing: 'linear',
        animationEasingUpdate: 'linear'
    };

    // Set the option and render the chart
    myChart.setOption(option);
});
