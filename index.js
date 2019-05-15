String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

$(document).ready(function() {
  $('#expression').val(Cookies.get('expression-0') || 'd20');

  google.charts.load('current', {'packages':['bar']});

  function refreshbuilder(expression, variables) {
    var templates = {};
    var matches = expression.match(/{.*?}/g);

    var newExpression = expression;
    $(matches).each(function(i, match) {
      var matchVar = match.replaceAll("{", "").replace("}", "");

      var modifierMatches = $('.builder-modifier-' + matchVar);
      modifierMatches.show();
      $(modifierMatches).each(function(i, builder) {
        if (!variables[builder]) {
          var builderVal = $(builder).find('.form-control').val();
          variables[builder] = builderVal
          // if (builderVal.length)
          //   newExpression = expression.replaceAll(match, match + builderVal + ' + ');
          if (builderVal.length)
            newExpression = expression + " + " + builderVal;
        }
      });

      var builderMatch = $('.builder-' + matchVar);
      builderMatch.show();
      if (!builderMatch.length)
        return;
      var builderVal = builderMatch.find('.form-control').val();
      // variables[match] = builderVal;
      newExpression = newExpression.replaceAll(match, builderVal);
    })

    if (newExpression != expression)
      return refreshbuilder(newExpression, variables)
    return expression;
  }

  function refresh() {
    $('.builder').hide();
    var expression = refreshbuilder($('#action').val(), {});
    var matches = expression.match(/{.*?}/g);

    $(matches).each(function(i, match) {
      // // resolve modifiers
      // var matchVar = match.replaceAll("{", "").replace("}", "");
      // var builderMatches = $('.builder-modifier-' + matchVar);
      // $(builderMatches).each(function(i, builder) {
      //   var builderVal = $(builder).find('.form-control').val();
      //   expression = expression.replaceAll(match, match + builderVal);
      // });
      //
      // // resolve variables
      // var builderMatch = $('.builder-' + matchVar);
      // if (builderMatch.length) {
      //   var builderVal = builderMatch.find('.form-control').val();
      //   variables[match] = builderVal;
      //   expression = expression.replaceAll(match, builderVal);
      // }
      // else {
      //   console.error('unresolved', matchVar);
      // }

      expression = expression.replaceAll(match, '');
    })

    $('#expression').val(expression);
    $('#form').submit();
  }

  $('.builder').find('.form-control').change(refresh);
  $('#action').change(refresh);

  $('#builder-btn').click(function() {
    refresh();

    $('#builder-modal').modal()
  })

  $('#add-btn').click(function(e) {
    var add = $("<input class='form-control expression' id='expression' placeholder='d20'>");
    add.val(Cookies.get('expression-' + $('.expression').length) || 'd20');
    $('#adds').append(add);
  })

  $('#roll').click(function(e) {
    e.preventDefault()
    $('#results').text('');

    $('.expression').each(function(index, expression) {
      if (!$('#advanced').is(':visible') && index > 0)
        return;

      var val = $(expression).val();
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
    })

  });

  $('#form').submit(function(e) {
    if (e)
      e.preventDefault()

    $('.expression').each(function(index, expression) {
      var val = $(expression).val();
      if (!val || !val.length && index > 0) {
        $(expression).remove();
        return;
      }
      Cookies.set('expression-' + index, val);
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
        var val = $($('.expression')[j]).val()
        if (!$('#advanced').is(':visible') || !parseInt($('#iterate').val())) {
          val = '' + parse(val, 0).average() + ': '+ val;;
        }
        rows.push(val);
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
