function shiftArray(array, shift) {
    var from = 0,
        val = array[from],
        group = 1;

    for (var i = 0; i < array.length; i++) {
        var to = ((from + shift) + array.length) % array.length;
        if (to === from) {
            break;
        }

        var t = array[to];
        array[to] = val;
        from = to;
        val = t;

        if (from < group) {
            from = group++;
            val = array[from];
        }
    }
}

function limitation(val, min, max) {
    val = val >> 0;

    if (val < min) {
        val = min;
    }
    if (val > max) {
        val = max;
    }

    return val;
}

function bitMask(size) {
    return Math.pow(2, size) - 1;
}

$.extend($.ui.dialog.prototype.options, {
    modal: true,
    autoOpen: false,
    resizable: false
});

$.extend($.ui.autocomplete.prototype.options, {
    delay: 0,
    minLength: 0,
    create: function() {
        $(this).click(function() {
            $(this).autocomplete('search');
        });
    }
});

function closeDialog(f) {
    return function() {
        var $this = $(this),
            run = f instanceof Function ? f.apply($this, arguments) : true;

        $.when(run).always(function(result) {
            if (result !== false) {
                $this.dialog('close');
            }
        });
    };
}

var templates = {
    fieldFilling: bitPlanes => `
<table class="ca-options-table" style="table-layout: fixed;">
    <tr><th width="65px">Bit plane</th><th width="100px">Method</th><th width="185px"></th><th width="35px">Fill</th></tr>
${bitPlanes.map(n => `
    <tr data-bit-plane="${n}">
        <td class="ca-bit-plane">${n}</td>
        <td>
            <select class="ca-filling-method" dir="rtl">
                <option value="random">Random</option>
                <option value="copy">Copy</option>
                <option value="invert">Invert</option>
                <option value="all1">All 1</option>
                <option value="all0">All 0</option>
            </select>
        </td>
        <td class="ca-filling-options">
            <div class="ca-filling-random"><span class="ca-filling-options-note">density, ‰</span><input type="text"></div>
            <div class="ca-filling-copy"><span class="ca-filling-options-note">from plane</span><input type="text" readonly="readonly"></div>
        </td>
        <td class="ca-bit-plane">
            <input type="checkbox" id="ca-filling-fill-plane-${n}" class="ca-bit-plane-cb"><label for="ca-filling-fill-plane-${n}"></label>
        </td>
    </tr>
`).join('')}
</table>`,

    colorSetting: colors => `
<div class="ca-state-select row">
${colors.map(n => `
    <div class="ca-state"><span class="ca-state-name">${n.label}</span><input type="text" class="jscolor" color-name="${n.color}" readonly="readonly"></div>
`).join('')}
</div>`,

    bitPlanesShow: bitPlanes => `
<table class="ca-options-table">
    <tr><th>Bit plane</th><th>Show</th></tr>
${bitPlanes.map(n => `
    <tr>
        <td class="ca-bit-plane">${n}</td>
        <td class="ca-bit-plane"><input type="checkbox" id="ca-show-plane-${n}" class="ca-bit-plane-cb"><label for="ca-show-plane-${n}"></label></td>
    </tr>
`).join('')}
</table>`,

    brushColorSelect: colors => colors.map(n => `
        <div class="ca-state" ca-state="${n.state}"><span class="ca-state-name">${n.label}</span><span class="ca-state-color" style="background-color: ${n.color}"></span></div>
    `).join('')
};



$(document).ready(function() {
    var X_SIZE_MIN = 32,
        Y_SIZE_MIN = 32,
        X_SIZE_MAX = 256,
        Y_SIZE_MAX = 256,
        CELL_SIDE_MIN = 1,
        CELL_SIDE_MAX = 20,
        CELL_BORDER_MIN = 0,
        CELL_BORDER_MAX = 4,
        BRUSH_SIZE = 11;

    var ca = window.ca = CellularAutomaton(X_SIZE_MAX, Y_SIZE_MAX, {
        wrapper: '#cells-wrapper',
        scalable: true,
        cellSideMin: CELL_SIDE_MIN,
        cellSideMax: CELL_SIDE_MAX,
        cellSide: 2,
        cellBorder: 1
    });

    var caBrush = CellFieldView(CellField(BRUSH_SIZE, BRUSH_SIZE), {
        wrapper: '#brush-wrapper',
        cellSide: 12,
        cellBorder: 1
    });
    caBrush.field.data[Math.floor(BRUSH_SIZE / 2)][Math.floor(BRUSH_SIZE / 2)] = 1;
    caBrush.field.brush = CellField(1, 1);
    caBrush.field.brush.data[0][0] = 1;

    ca.cells.brush = caBrush.field.clone();

    $('#ca-brush').dialog({
        width: 370,
        create: function() {
            $(this).find('.ca-state-select').on('click', '.ca-state', function() {
                var $this = $(this);
                $this.parent().find('.ui-state-active').removeClass('ui-state-active');
                $this.addClass('ui-state-active');
                caBrush.field.brush.data[0][0] = $this.attr('ca-state');
            }).height(caBrush.canvas.height);
        },
        open: function() {
            var colors = caBrush.colors = ca.view.colors;
            caBrush.field.copy(ca.cells.brush);
            caBrush.render();

            $(this).find('.ca-state-select').html(templates.brushColorSelect($.map(colors, function(n, i) {
                return isNaN(i) ? null : {
                    label: (+i).toString(16).toUpperCase(),
                    state: i,
                    color: n
                };
            }))).find('[ca-state="' + caBrush.field.brush.data[0][0] + '"]').addClass('ui-state-active');
        },
        buttons: {
            'OK': closeDialog(function() {
                ca.cells.brush.copy(caBrush.field);
            }),
            'Cancel': closeDialog()
        }
    });


    $('#ca-filling').dialog({
        width: 480,
        create: function() {
            var planesList = ca.cells.getBitPlanes(),
                planesHTML = templates.fieldFilling(planesList);

            var max = ca.cells.randomFillDensityDescritization;
            $(this).append(planesHTML).find('.ca-filling-random > input').spinner({
                min: 0,
                max: max,
                step: 1
            }).val(max / 2).end().find('select').selectmenu({
                width: 100
            }).on('selectmenuchange', function(e, ui) {
                $(this).closest('tr').find('.ca-filling-options').find('>').hide().end().find('.ca-filling-' + (ui ? ui.item.value : this.value)).show();
            }).trigger('selectmenuchange').end().find('.ca-filling-copy > input').autocomplete({
                source: function(request, response) {
                    var ownPlane = +this.element.closest('tr').attr('data-bit-plane');

                    response(planesList.filter(n => n !== ownPlane).map(n => ({
                        label: n,
                        value: n
                    })));
                }
            }).end().find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
        },
        buttons: {
            'OK': closeDialog(function() {
                var fillRandom = {},
                    fillCopy = {},
                    fillInvert = [];

                this.find('.ca-bit-plane-cb').each(function(i) {
                    if (this.checked) {
                        var $tr = $(this).closest('tr');

                        switch ($tr.find('.ca-filling-method').val()) {
                            case 'invert': fillInvert.push(i); break;
                            case   'all1': fillRandom[i] = ca.cells.randomFillDensityDescritization; break;
                            case   'all0': fillRandom[i] = 0; break;
                            case 'random': fillRandom[i] = $tr.find('.ca-filling-random input').val(); break;
                            case   'copy': fillCopy[i] = $tr.find('.ca-filling-copy input').val(); break;
                        }
                    }
                });

                if (fillInvert.length) {
                    ca.cells.invertBitPlane(fillInvert);
                }
                if (Object.keys(fillRandom).length) {
                    ca.cells.fillRandom(fillRandom);
                }
                if (Object.keys(fillCopy).length) {
                    ca.cells.copyBitPlane(fillCopy);
                }

                ca.view.render();
            }),
            'Cancel': closeDialog()
        }
    });

    $('#ca-view-settings').tabs();

    $('#ca-view').dialog({
        width: 320,
        height: 460,
        create: function() {
            var $this = $(this);

            [
                [ '#ca-field-x-size',      X_SIZE_MIN,      X_SIZE_MAX ],
                [ '#ca-field-y-size',      Y_SIZE_MIN,      Y_SIZE_MAX ],
                [ '#ca-field-cell-side',   CELL_SIDE_MIN,   CELL_SIDE_MAX ],
                [ '#ca-field-cell-border', CELL_BORDER_MIN, CELL_BORDER_MAX ]
            ].forEach((function(n) {
                this.find(n[0]).spinner({
                    min: n[1],
                    max: n[2],
                    step: 1
                }).attr('maxlength', n[2].toString().length);
            }).bind($this));
            $this.find('#ca-field-x-size, #ca-field-y-size').parent().addClass('ca-start-disable');


            $this.find('#ca-view-colors').append(templates.colorSetting($.map(ca.view.colors, (n, i) => ({
                color: i,
                label: isNaN(i) ? i : (+i).toString(16).toUpperCase()
            })))).find('.jscolor').each(function() {
                this.jscolor = new jscolor(this, {
                    hash: true
                });
            });


            $this
                .find('#ca-view-planes').append(templates.bitPlanesShow(ca.cells.getBitPlanes()))
                .find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
        },
        open: function() {
            $(this)
                .find('#ca-field-x-size').val(ca.cells.xSize).end()
                .find('#ca-field-y-size').val(ca.cells.ySize).end()
                .find('#ca-field-cell-side').val(ca.view.cellSide).end()
                .find('#ca-field-cell-border').val(ca.view.cellBorder).end()
                .find('.jscolor').each(function() {
                    var $this = $(this);
                    $this.val(ca.view.colors[$this.attr('color-name')]);
                    this.jscolor.importColor();
                }).end()
                .find('.ca-bit-plane-cb').each(function(i) {
                    this.checked = !!(ca.view.showBitPlanes & (1 << i));
                }).change();
        },
        buttons: {
            'OK': closeDialog(function() {
                var newColors = {};
                this.find('.jscolor').each(function() {
                    var $this = $(this);
                    newColors[$this.attr('color-name')] = $this.val();
                });
                ca.view.colors = newColors;

                ca.view.showBitPlanes = this.find('.ca-bit-plane-cb').toArray().reduce((prev, curr, i) => prev | (curr.checked << i), 0);

                ca.resize({
                    xSize: limitation(this.find('#ca-field-x-size').val(), X_SIZE_MIN, X_SIZE_MAX),
                    ySize: limitation(this.find('#ca-field-y-size').val(), Y_SIZE_MIN, Y_SIZE_MAX),
                    cellSide: limitation(this.find('#ca-field-cell-side').val(), CELL_SIDE_MIN, CELL_SIDE_MAX),
                    cellBorder: limitation(this.find('#ca-field-cell-border').val(), CELL_BORDER_MIN, CELL_BORDER_MAX)
                });
            }),
            'Cancel': closeDialog()
        }
    });


    $('#ca-rule').dialog({
        width: '80%',
        create: function() {
            var $this = $(this);

            $this.find('#ca-rule-name-clear').click(function() {
                $(this).parent().find('input').val('');
            });

            $this.find('#ca-rule-name').width(200).autocomplete({
                source: function(request, response) {
                    var term = request.term.toLowerCase();

                    response(rules.get().filter(n => !!n.name.toLowerCase().match(term)).map(n => ({
                        matched: n.name.replace(new RegExp('(' + request.term + ')', 'i'), '<span class="matched-text">$1</span>'),
                        label: n.name,
                        value: n.code,
                        predefined: n.predefined
                    })));
                },
                select: function(e, ui) {
                    $(this).val(ui.item.label);
                    $('#ca-rule-code').val(ui.item.value);

                    return false;
                }
            }).data('ui-autocomplete')._renderItem = function(ul, item) {
                var $item = $('<div></div>').html(item.matched);
                if (item.predefined) {
                    $item.addClass('predefined-rule');
                }

                return $('<li></li>').data('item.autocomplete', item).append($item).appendTo(ul);
            };

            $this.find('#ca-rule-save').button().click(function() {
                var result = rules.save($('#ca-rule-name').val(), $('#ca-rule-code').val());
                toastr[result.status ? 'success' : 'error'](result.message);
            }).end().find('#ca-rule-delete').button().click(function() {
                var result = rules.del($('#ca-rule-name').val());
                toastr[result.status ? 'success' : 'error'](result.message);
            });

            $this.find('#ca-rule-code').keydown(function(e) {
                if (e.keyCode === 9) {
                    var start = this.selectionStart,
                        end = this.selectionEnd,
                        $this = $(this),
                        value = $this.val(),
                        tab = '    ';

                    $this.val(value.substring(0, start) + tab + value.substring(end));

                    this.selectionStart = this.selectionEnd = start + tab.length;

                    e.preventDefault();
                }
            });
        },
        open: function() {
            $('#ca-rule-code').val(ca.rule);
        },
        buttons: {
            'OK': closeDialog(function() {
                try {
                    ca.rule = $('#ca-rule-code').val();
                } catch (e) {
                    toastr.error(e.message);
                    return false;
                }
            }),
            'Cancel': closeDialog()
        }
    });


    $('#ca-speed').dialog({
        width: 320,
        create: function() {
            $(this).find('#steps-per-stroke').spinner({
                min: 1,
                max: 100,
                step: 1
            }).end().find('#stroke-duration').spinner({
                min: 10,
                max: 5000,
                step: 10
            });
        },
        open: function() {
            $(this)
                .find('#steps-per-stroke').val(ca.stepsPerStroke).end()
                .find('#stroke-duration').val(ca.strokeDuration);
        },
        buttons: {
            'OK': closeDialog(function() {
                ca.stepsPerStroke = this.find('#steps-per-stroke').val();
                ca.strokeDuration = this.find('#stroke-duration').val();
            }),
            'Cancel': closeDialog()
        }
    });


    $('#cell-field-mode').buttonset({
        items: 'input'
    }).find('.ui-checkboxradio-radio-label').removeClass('ui-checkboxradio-radio-label').end().click(function(e) {
        var mode = $(e.target).val();
        if (mode && ca.view.mode !== mode) {
            ca.view.mode = mode;
        }
    }).find('[for="mode-' + ca.view.mode + '"]').click();


    $('.content > .controls')
        .find('button').button().end()
        .on('click.ca-dialog', '[data-dialog]', function() {
            $('#' + $(this).attr('data-dialog')).dialog('open');
        })
        .on('click.ca-action', '[data-action]', function() {
            ca[$(this).attr('data-action')]();
        });

    $('#cell-field-data').buttonset();

    $(document).on({
        'ca-start': function() {
            $('.ca-start-disable').addClass('ui-state-disabled');
            $('.ca-start-hide').hide();
            $('.ca-start-show').show();

            if (ca.view.mode === 'edit') {
                ca.view.mode = 'shift';
            }
        },
        'ca-stop': function() {
            $('.ca-start-disable').removeClass('ui-state-disabled');
            $('.ca-start-hide').show();
            $('.ca-start-show').hide();

            ca.view.mode = 'edit';
        },
        'cell-field-mode': function(e) {
            var cf = e.originalEvent.detail.cellField;
            if (cf === ca.cells) {
                $('#cell-field-mode').find('[for="mode-' + ca.view.mode + '"]').click();
            }
        }
    }).trigger('ca-stop');


    $('#skip').click(function() {
        var $steps = $(this).parent().find('input'),
            steps = limitation($steps.val(), 1, Math.pow(10, $steps.attr('maxlength')) - 1);

        $steps.val(steps);

        ca.newGeneration(steps);
    }).parent().find('input').width(50).val('1');

    var defaultRule = 'Conway\'s Life';
    ca.rule = rules.get(defaultRule);
    $('#ca-rule-name').val(defaultRule);

    $('body').removeClass('hidden');
});
