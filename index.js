
$(document).ready(function() {
  google.charts.load('current', {'packages':['bar']});

  $('#form').submit(function(e) {
    e.preventDefault()
    var val = $('#expression').val();
    $('#results').text('');
    try {
      val = parse(val);
      var average = val.average();
      // var percent = val.percent();
      var faces = val.keys();
      $('#results').append($('<div></div>').text('Average: ' + average).addClass('form-text'))

      var rows = [['Result', 'Normal', "Crit/Fail"]];
      var total = val.total();
      var except = val.except || {};
      for (var face of faces) {
        var crit = (except[face] || 0);
        var all = val[face];
        rows.push([face, (all - crit) * 100 / total, crit * 100 / total]);
      }

      var data = google.visualization.arrayToDataTable(rows);

      // Set chart options
      var options = {
        vAxes: {
          0: {
            title:'Percent',
          }
        },
        isStacked: true,
        height: 400,
        bars: 'vertical', // Required for Material Bar Charts.
      };

      // Instantiate and draw our chart, passing in some options.
      var chart = new google.charts.Bar(document.getElementById('chart_div'));
      chart.draw(data, google.charts.Bar.convertOptions(options));
    }
    catch (e) {
      $('#results').text(e)
    }
  });


  for (var e of $('.example')) {
    $(e).html('<a href="#">' + $(e).text() + "</a>")
  }

  $('.example').click(function(e) {
    $('#expression').val($(e.target).text())
    $('#form').submit()
  })
})
