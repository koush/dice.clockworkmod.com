
$(document).ready(function() {
  google.charts.load('current', {'packages':['bar']});

  $('#advanced-btn').click(function() {
    if ($('#advanced').is(':visible'))
      $('#roll').show();
    else {
      $('#roll').hide();
    }
  })

  $('#roll').click(function(e) {
    e.preventDefault()
    var val = $('#expression').val();
    $('#results').text('');

    val = parse(val, 0);
    var roll = Math.floor(Math.random() * val.total());
    for (var key of val.keys()) {
      var num = val[key];
      if (roll < num) {
        $('#results').append($('<div></div>').text('Rolled: ' + key).addClass('form-text'))
        break;
      }
      roll -= num;
    }
  });

  $('#form').submit(function(e) {
    e.preventDefault()

    var val = $('#expression').val();
    $('#results').text('');
    try {
      if ($('#advanced').is(':visible') && parseInt($('#iterate').val())) {

        var rows = [['value of n', 'Average Result']];

        for (var i = 0; i < parseInt($('#iterate').val()); i++) {
          var nval = parse(val, i);
          rows.push([i.toString(), nval.average()]);
        }

        var data = google.visualization.arrayToDataTable(rows);

        // Set chart options
        var options = {
          vAxes: {
            0: {}
          },
          isStacked: true,
          height: 400,
          bars: 'vertical', // Required for Material Bar Charts.
        };

        // Instantiate and draw our chart, passing in some options.
        var chart = new google.charts.Bar(document.getElementById('chart_div'));
        chart.draw(data, google.charts.Bar.convertOptions(options));
      }
      else {
        val = parse(val, 0);
        var average = val.average();
        // var percent = val.percent();
        var faces = val.keys();
        $('#results').append($('<div></div>').text('Average: ' + average).addClass('form-text'))

        var rows = [['Result', 'Normal', "Crit/Fail"]];
        var total = val.total();
        var except = val.private.except || {};
        for (var face of faces) {
          var crit = (except[face] || 0);
          var all = val[face];
          rows.push([face, (all - crit) / total, crit / total]);
        }

        var data = google.visualization.arrayToDataTable(rows);

        // Set chart options
        var options = {
          vAxes: {
            0: {
              title:'Percent',
              format: 'percent',
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
    }
    catch (e) {
      $('#results').text(e)
    }
  });


  for (var e of $('.example')) {
    $(e).html('<a href="#">' + $(e).text() + "</a>")
  }

  $('.example').click(function(e) {
    $('.collapse').removeClass('show');
    $('#expression').val($(e.target).text())
    $('#form').submit()
  })
})
