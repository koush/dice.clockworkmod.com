
$(document).ready(function() {
  google.charts.load('current', {'packages':['bar']});

  $('#advanced-btn').click(function() {
    if ($('#advanced').is(':visible'))
      $('#roll').show();
    else {
      $('#roll').hide();
    }
  })

  $('#add-btn').click(function(e) {
    $('#adds').prepend("<input class='form-control expression' id='expression' placeholder='d20' value='d20'>")
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

    $('.expression').each(function(index, expression) {
      var val = $(expression).val();
      if (!val || !val.length && index > 0) {
        $(expression).remove();
        return;
      }
    });

    var numExpressions = $('.expression').length;
    if (!$('#advanced').is(':visible'))
      numExpressions = 1;
    var internalRows = {};
    var addRowInternal = function(index, val, percent) {
      if (!internalRows[val]) {
        internalRows[val] = []
        for (var j = 0; j < numExpressions; j++) {
          internalRows[val].push(0);
        }
      }
      internalRows[val][index] = percent;
    }

    var genRows = function() {
      rows = ['value'];
      for (var j = 0; j < numExpressions; j++) {
        rows.push($($('.expression')[j]).val());
      }
      rows = [rows];
      $.each(internalRows, function(k, v) {
        v.unshift(k);
        rows.push(v)
      });
    }


    if ($('#advanced').is(':visible') && parseInt($('#iterate').val())) {
      var rows = [['value of n', 'Average Result']];

      // Set chart options
      var options = {
        vAxes: {
          0: {}
        },
        isStacked: numExpressions == 1,
        height: 400,
        bars: 'vertical', // Required for Material Bar Charts.
      };

      var addRow = function(index, i, nval) {
        if (numExpressions == 1)
          rows.push([i.toString(), nval.average()]);
        else
          addRowInternal(index, i, nval.average())
      }
    }
    else {
      var rows = [['Result', 'Normal', "Crit/Fail"]];

      // Set chart options
      var options = {
        vAxes: {
          0: {
            title:'Percent',
            format: 'percent',
          }
        },
        isStacked: numExpressions == 1,
        height: 400,
        bars: 'vertical', // Required for Material Bar Charts.
      };

      var addRow = function(index, face, all, crit, total) {
        if (numExpressions == 1)
          rows.push([face, (all - crit) / total, crit / total]);
        else
          addRowInternal(index, face, all / total);
      }
    }

    $('.expression').each(function(index, expression) {
      var val = $(expression).val();

      if (index >= numExpressions)
        return;

      $('#results').text('');
      try {
        if ($('#advanced').is(':visible') && parseInt($('#iterate').val())) {

          for (var i = 0; i < parseInt($('#iterate').val()); i++) {
            var nval = parse(val, i);
            addRow(index, i, nval);
          }
        }
        else {
          val = parse(val, 0);
          var average = val.average();
          // var percent = val.percent();
          var faces = val.keys();
          if (numExpressions == 1)
            $('#results').append($('<div></div>').text('Average: ' + average).addClass('form-text'))

          var total = val.total();
          var except = val.private.except || {};
          for (var face of faces) {
            var crit = (except[face] || 0);
            var all = val[face];
            addRow(index, face, all, crit, total);
          }
        }
      }
      catch (e) {
        $('#results').text(e)
      }
    });

    if (numExpressions > 1)
      genRows();
    var data = google.visualization.arrayToDataTable(rows);

    var chart = new google.charts.Bar(document.getElementById('chart_div'));
    chart.draw(data, google.charts.Bar.convertOptions(options));
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
