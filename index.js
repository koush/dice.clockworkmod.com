
$(document).ready(function() {
  google.charts.load('current', {'packages':['bar']});

  $('#form').submit(function(e) {
    e.preventDefault()
    var val = $('#expression').val();
    $('#results').text('');
    try {
      val = parse(val);
      var average = val.average();
      var percent = val.percent();
      var faces = val.keys();
      $('#results').append($('<div></div>').text('Average: ' + average).addClass('form-text'))

      // var data = new google.visualization.DataTable();
      // data.addColumn('string', 'Result');
      // data.addColumn('number', 'Percent');

      var rows = [['Result', 'Percent']];
      for (var face of faces) {
        rows.push([face, percent[face] * 100]);
      }
      // data.addRows(rows);

      var data = google.visualization.arrayToDataTable(rows);

      // Set chart options
      var options = {'title':'Results',
                      bars: 'vertical', // Required for Material Bar Charts.
                      legend: { position: "none" },
                     };

      // Instantiate and draw our chart, passing in some options.
      var chart = new google.charts.Bar(document.getElementById('chart_div'));
      chart.draw(data, google.charts.Bar.convertOptions(options));
    }
    catch (e) {
      $('#results').text(e)
    }
  });
})
