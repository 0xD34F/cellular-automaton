$(document).ready(function() {
    var X_SIZE = 256,
        Y_SIZE = 256;

    var ca = window.ca = CellularAutomaton(X_SIZE, Y_SIZE, {
        wrapper: $('#cells-wrapper')[0],
        width: 800,
        height: 800,
        cellSide: 2,
        border: 1
    });

    var BRUSH_SIZE = 11;

    ca.cells.brush = CellField(BRUSH_SIZE, BRUSH_SIZE);
    ca.cells.brush.data[Math.floor(BRUSH_SIZE / 2)][Math.floor(BRUSH_SIZE / 2)] = 1;

    var brushDialog = null;

    $('#start').click(function() {
        if (ca.isStarted()) {
            ca.stop();
            this.innerHTML = 'Start';
        } else {
            ca.start();
            this.innerHTML = 'Stop';
        }
    });

    $('#brush').click(function() {
        $('#ca-brush').dialog('open');
    });

    $('#ca-brush').dialog({
        modal: true,
        autoOpen: false,
        create: function() {
            var $brushWrapper = $('<div class="cells-field-wrapper" />').appendTo($(this));

            brushDialog = CellField(BRUSH_SIZE, BRUSH_SIZE, {
                wrapper: $brushWrapper[0],
                cellSide: 10,
                border: 1
            });
        },
        open: function() {
            brushDialog.copy(ca.cells.brush);
            brushDialog.draw();
        },
        buttons: {
            'OK': function() {
                ca.cells.brush.copy(brushDialog);
                $(this).dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });
});
