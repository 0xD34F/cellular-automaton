import $ from 'jquery';

import 'jquery-ui/ui/core';
import 'jquery-ui/ui/widgets/autocomplete';
import 'jquery-ui/ui/widgets/button';
import 'jquery-ui/ui/widgets/dialog';
import 'jquery-ui/ui/widgets/spinner';
import 'jquery-ui/ui/widgets/selectmenu';
import 'jquery-ui/ui/widgets/tabs';
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/autocomplete.css';
import 'jquery-ui/themes/base/button.css';
import 'jquery-ui/themes/base/controlgroup.css';
import 'jquery-ui/themes/base/dialog.css';
import 'jquery-ui/themes/base/spinner.css';
import 'jquery-ui/themes/base/selectmenu.css';
import 'jquery-ui/themes/base/tabs.css';
import 'jquery-ui/themes/base/theme.css';

import 'jscolor-picker';

import toastr from 'toastr';
import 'toastr/toastr.scss';

import { limitation } from './utils';

import { CellField, CellFieldView, CellularAutomaton, Rules } from './ca/';

import config from './config';

import './main.scss';

$.extend($.ui.autocomplete.prototype.options, {
    delay: 0,
    minLength: 0,
    create: function() {
        $(this).click(function() {
            $(this).autocomplete('search');
        });
    }
});

$.widget('ui.spinner', $.ui.spinner, {
    _create: function() {
        this.element.attr('maxlength', this.options.max.toString(10).length);

        return this._super();
    }
});

$.widget('ui.confirmDialog', $.ui.dialog, {
    options: {
        modal: true,
        autoOpen: false,
        resizable: false
    },
    _closeDialog: function(f) {
        return function() {
            var $this = $(this),
                run = f instanceof Function ? f.apply($this, arguments) : true;

            $.when(run).always(function(result) {
                if (result !== false) {
                    $this.confirmDialog('close');
                }
            });
        };
    },
    _create: function() {
        this.options.buttons = {
            OK: this._closeDialog(this.options.ok || null),
            Cancel: this._closeDialog(this.options.cancel || null)
        };

        return this._super();
    },
    open: function() {
        this._super();
        this.overlay.on('click', () => this.element.confirmDialog('close'));

        return this;
    }
});


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
    <div class="ca-state"><div><span class="ca-state-name">${n.label}</span><input type="text" class="jscolor" color-name="${n.color}" readonly="readonly"></div></div>
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
<div class="ca-state" ca-state="${n.state}"><div><span class="ca-state-name">${n.label}</span><span class="ca-state-color" style="background-color: ${n.color}"></span></div></div>
    `).join('')
};



$(document).ready(function() {
    const {
        X_SIZE_MIN,
        Y_SIZE_MIN,
        X_SIZE_MAX,
        Y_SIZE_MAX,
        CELL_SIDE_MIN,
        CELL_SIDE_MAX,
        CELL_BORDER_MIN,
        CELL_BORDER_MAX,
        BRUSH_SIZE,
    } = config;

    var caBrush = new CellFieldView(new CellField(BRUSH_SIZE), {
        wrapper: '#brush-wrapper',
        cellSide: 12,
        cellBorder: 1,
        brush: new CellField(1).fill(() => 1)
    });
    caBrush.field.data[Math.floor(BRUSH_SIZE / 2)][Math.floor(BRUSH_SIZE / 2)] = 1;

    var ca = window.ca = new CellularAutomaton({
        xSize: config.DEFAULT_X_SIZE,
        ySize: config.DEFAULT_Y_SIZE,
        ruleName: config.DEFAULT_RULE,
        view: {
            wrapper: '#cells-wrapper',
            scaling: {
                min: CELL_SIDE_MIN,
                max: CELL_SIDE_MAX
            },
            cellSide: config.DEFAULT_CELL_SIDE,
            cellBorder: config.DEFAULT_CELL_BORDER,
            brush: caBrush.field.clone()
        }
    });


    $('#ca-brush').confirmDialog({
        width: 380,
        create: function() {
            $(this).find('.ca-state-select').on('click', '.ca-state', function() {
                var $this = $(this);
                $this.parent().find('.ui-state-active').removeClass('ui-state-active');
                $this.addClass('ui-state-active');
                caBrush.brush.data[0][0] = +$this.attr('ca-state');
            });
        },
        open: function() {
            caBrush.setColors(ca.view.colors);
            caBrush.field.copy(ca.view.brush);
            caBrush.render();

            $(this).find('.ca-state-select').html(templates.brushColorSelect($.map(caBrush.colors, function(n, i) {
                return isNaN(i) ? null : {
                    label: (+i).toString(16).toUpperCase(),
                    state: i,
                    color: n
                };
            }))).find(`[ca-state="${caBrush.brush.data[0][0]}"]`).addClass('ui-state-active');
        },
        ok: function() {
            ca.view.brush.copy(caBrush.field);
        }
    });


    $('#ca-filling').confirmDialog({
        width: 480,
        create: function() {
            var planesList = ca.cells.getBitPlanes(),
                planesHTML = templates.fieldFilling(planesList);

            var max = ca.cells.randomFillDensityDescritization;
            $(this).append(planesHTML).find('.ca-filling-random > input').spinner({
                min: 0,
                max: max,
                step: 1
            }).val(max * config.DEFAULT_FILL_DENSITY | 0).end().find('select').selectmenu({
                width: 100
            }).on('selectmenuchange', function(e, ui) {
                $(this).closest('tr').find('.ca-filling-options').find('>').hide().end().find(`.ca-filling-${ui ? ui.item.value : this.value}`).show();
            }).trigger('selectmenuchange').end().find('.ca-filling-copy > input').autocomplete({
                source: function(request, response) {
                    var ownPlane = +this.element.closest('tr').attr('data-bit-plane');

                    response(planesList.filter(n => n !== ownPlane).map(n => n.toString()));
                }
            }).end().find('.ca-bit-plane-cb').checkboxradio().attr('checked', 'checked').change();
        },
        ok: function() {
            var invert = [],
                random = {},
                copy = {};

            this.find('.ca-bit-plane-cb:checked').each(function() {
                var $tr = $(this).closest('tr'),
                    plane = $tr.attr('data-bit-plane');

                switch ($tr.find('.ca-filling-method').val()) {
                    case 'invert': invert.push(plane); break;
                    case   'all1': random[plane] = ca.cells.randomFillDensityDescritization; break;
                    case   'all0': random[plane] = 0; break;
                    case 'random': random[plane] = $tr.find('.ca-filling-random input').val(); break;
                    case   'copy': copy[plane] = $tr.find('.ca-filling-copy input').val(); break;
                }
            });

            ca.fill({ invert, random, copy });
        }
    });

    $('#ca-field-settings').tabs();

    $('#ca-field').confirmDialog({
        width: 320,
        height: 460,
        create: function() {
            var $this = $(this);

            [
                [ '#ca-field-x-size',      X_SIZE_MIN,      X_SIZE_MAX ],
                [ '#ca-field-y-size',      Y_SIZE_MIN,      Y_SIZE_MAX ],
                [ '#ca-field-cell-side',   CELL_SIDE_MIN,   CELL_SIDE_MAX ],
                [ '#ca-field-cell-border', CELL_BORDER_MIN, CELL_BORDER_MAX ]
            ].forEach(n => $this.find(n[0]).spinner({
                min: n[1],
                max: n[2],
                step: 1
            }));


            $this.find('#ca-field-colors').append(templates.colorSetting($.map(ca.view.colors, (n, i) => ({
                color: i,
                label: isNaN(i) ? i : (+i).toString(16).toUpperCase()
            })))).find('.jscolor').each(function() {
                this.jscolor = new jscolor(this, {
                    hash: true
                });
            });


            $this
                .find('#ca-field-planes').append(templates.bitPlanesShow(ca.cells.getBitPlanes()))
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
        ok: function() {
            var newColors = {};
            this.find('.jscolor').each(function() {
                var $this = $(this);
                newColors[$this.attr('color-name')] = $this.val();
            });
            ca.view.setColors(newColors);

            ca.view.showBitPlanes = this.find('.ca-bit-plane-cb').toArray().reduce((planes, cb, i) => planes | (cb.checked << i), 0);

            ca.resize({
                xSize: limitation(this.find('#ca-field-x-size').val(), X_SIZE_MIN, X_SIZE_MAX),
                ySize: limitation(this.find('#ca-field-y-size').val(), Y_SIZE_MIN, Y_SIZE_MAX),
                cellSide: limitation(this.find('#ca-field-cell-side').val(), CELL_SIDE_MIN, CELL_SIDE_MAX),
                cellBorder: limitation(this.find('#ca-field-cell-border').val(), CELL_BORDER_MIN, CELL_BORDER_MAX)
            });
        }
    });


    $('#ca-rule').confirmDialog({
        width: '80%',
        create: function() {
            var $this = $(this);

            $this.find('#ca-rule-name-clear').click(function() {
                $('#ca-rule-name').val('');
            });

            $this.find('#ca-rule-name').autocomplete({
                source: function(request, response) {
                    var term = request.term.toLowerCase();

                    response(Rules.get().filter(n => !!n.name.toLowerCase().match(term)).map(n => ({
                        matched: n.name.replace(new RegExp(`(${request.term})`, 'i'), '<span class="matched-text">$1</span>'),
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
                var result = Rules.save($('#ca-rule-name').val(), $('#ca-rule-code').val());
                toastr[result.status ? 'success' : 'error'](result.message);
            }).end().find('#ca-rule-delete').button().click(function() {
                var result = Rules.del($('#ca-rule-name').val());
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
        ok: function() {
            try {
                ca.rule = $('#ca-rule-code').val();
            } catch (e) {
                toastr.error(e.message);
                return false;
            }
        }
    });


    $('#ca-speed').confirmDialog({
        width: 320,
        create: function() {
            $(this).find('#generations-per-step').spinner({
                min: config.GENERATIONS_PER_STEP_MIN,
                max: config.GENERATIONS_PER_STEP_MAX,
                step: config.GENERATIONS_PER_STEP_CHANGE
            }).end().find('#step-duration').spinner({
                min: config.STEP_DURATION_MIN,
                max: config.STEP_DURATION_MAX,
                step: config.STEP_DURATION_CHANGE
            });
        },
        open: function() {
            $(this)
                .find('#generations-per-step').val(ca.generationsPerStep).end()
                .find('#step-duration').val(ca.stepDuration);
        },
        ok: function() {
            ca.generationsPerStep = this.find('#generations-per-step').val();
            ca.stepDuration = this.find('#step-duration').val();
        }
    });

    $('#cell-field-mode').buttonset({
        items: 'input'
    }).find('.ui-checkboxradio-radio-label').removeClass('ui-checkboxradio-radio-label').end().click(function(e) {
        var mode = $(e.target).val();
        if (mode && ca.view.mode !== mode) {
            ca.view.mode = mode;
        }
    }).find(`[for="mode-${ca.view.mode}"]`).click();


    $('.content > .controls')
        .find('button').button().end()
        .on('click.ca-dialog', '[data-dialog]', function() {
            $(`#${$(this).attr('data-dialog')}`).confirmDialog('open');
        })
        .on('click.ca-action', '[data-action]', function() {
            ca[$(this).attr('data-action')]();
        });

    $('#cell-field-data').buttonset();

    $(window).on({
        'resize': function() {
            ca.view.resize();
        }
    });

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
        }
    }).trigger('ca-stop');

    $(ca.view.canvas).on('cell-field-mode', function() {
        $('#cell-field-mode').find(`[for="mode-${ca.view.mode}"]`).click();
    });


    $('#skip').click(function() {
        ca.newGeneration($(this).parent().find('input').val());
    }).parent().find('input').width(50).on('input', function() {
        var $this = $(this),
            val = parseInt($this.val(), 10);

        $this.val(limitation(val, config.SKIP_GENERATIONS_MIN, config.SKIP_GENERATIONS_MAX));
    }).val(config.SKIP_GENERATIONS_MIN);


    $('#save-as-image').click(function() {
        ca.view.download();
    });


    $('.ui-helper-hidden').removeClass('ui-helper-hidden');

    ca.view.resize();
});
