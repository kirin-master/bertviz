/**
 * @fileoverview Transformer Visualization D3 javascript code.
 *
 * Based on: https://github.com/tensorflow/tensor2tensor/blob/master/tensor2tensor/visualization/attention.js
 *
 * Change log:
 *
 * 02/01/19  Jesse Vig   Initial implementation
 * 12/31/20  Jesse Vig   Support multiple visualizations in single notebook.
 * 01/19/21  Jesse Vig   Support light/dark modes
 * 02/06/21  Jesse Vig   Move require config from separate jupyter notebook step
 * 05/03/21  Jesse Vig   Adjust visualization height dynamically
 **/

require.config({
  paths: {
      d3: '//cdnjs.cloudflare.com/ajax/libs/d3/5.7.0/d3.min',
    jquery: '//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min',
  }
});

requirejs(['jquery', 'd3'], function($, d3) {

        const params = PYTHON_PARAMS; // HACK: PYTHON_PARAMS is a template marker that is replaced by actual params.
        const config = {};

        const MIN_X = 0;
        const MIN_Y = 0;
        const DIV_WIDTH = 970;
        const THUMBNAIL_PADDING = 5;
        const DETAIL_WIDTH = 300;
        const DETAIL_ATTENTION_WIDTH = 140;
        const DETAIL_BOX_WIDTH = 80;
        const DETAIL_BOX_HEIGHT = 18;
        const DETAIL_PADDING = 28;
        const ATTN_PADDING = 0;
        const DETAIL_HEADING_HEIGHT = 25;
        const DETAIL_HEADING_TEXT_SIZE = 15;
        const TEXT_SIZE = 13;
        const LAYER_COLORS = d3.schemeCategory10;
        const PALETTE = {
            'light': {
                'text': 'black',
                'background': 'white',
                'highlight': '#F5F5F5'
            },
            'dark': {
                'text': '#bbb',
                'background': 'black',
                'highlight': '#222'
            }
        }

        function render() {

            // Set global state variables

            var attData = config.attention[config.filter];
            config.leftText = attData.left_text;
            config.rightText = attData.right_text;
            config.attn = attData.attn;
            config.numLayers = config.attn.length;
            config.numHeads = config.attn[0].length;
            config.thumbnailBoxHeight = 7 * (12 / config.totalHeads);
            config.thumbnailHeight = Math.max(config.leftText.length, config.rightText.length) * config.thumbnailBoxHeight + 2 * THUMBNAIL_PADDING;
            config.thumbnailWidth = DIV_WIDTH / config.totalHeads;
            config.detailHeight = Math.max(config.leftText.length, config.rightText.length) * DETAIL_BOX_HEIGHT + 2 * DETAIL_PADDING + DETAIL_HEADING_HEIGHT;
            config.divHeight = Math.max(config.numLayers * config.thumbnailHeight, config.detailHeight);

            const vis = $(`#${config.rootDivId} #vis`)
            vis.empty();
            vis.attr("height", config.divHeight);
            config.svg = d3.select(`#${config.rootDivId} #vis`)
                .append('svg')
                .attr("width", DIV_WIDTH)
                .attr("height", config.divHeight)
              .attr("fill", getBackgroundColor());

            var i;
            var j;
            for (i = 0; i < config.numLayers; i++) {
                for (j = 0; j < config.numHeads; j++) {
                    renderThumbnail(i, j);
                }
            }
        }

        function renderThumbnail(layerIndex, headIndex) {
            var x = headIndex * config.thumbnailWidth;
            var y = layerIndex * config.thumbnailHeight;
            renderThumbnailAttn(x, y, config.attn[layerIndex][headIndex], layerIndex, headIndex);
        }

        function renderDetail(att, layerIndex, headIndex) {
            var xOffset = .8 * config.thumbnailWidth;
            var maxX = DIV_WIDTH;
            var maxY = config.divHeight;
            var leftPos = (headIndex / config.totalHeads) * DIV_WIDTH
            var x = leftPos + THUMBNAIL_PADDING + xOffset;
            if (x < MIN_X) {
                x = MIN_X;
            } else if (x + DETAIL_WIDTH > maxX) {
                x = leftPos + THUMBNAIL_PADDING - DETAIL_WIDTH + 8;
            }
            var posLeftText = x;
            var posAttention = posLeftText + DETAIL_BOX_WIDTH;
            var posRightText = posAttention + DETAIL_ATTENTION_WIDTH;
            var thumbnailHeight = Math.max(config.leftText.length, config.rightText.length) * config.thumbnailBoxHeight + 2 * THUMBNAIL_PADDING;
            var yOffset = 20;
            var y = layerIndex * thumbnailHeight + THUMBNAIL_PADDING + yOffset;
            if (y < MIN_Y) {
                y = MIN_Y;
            } else if (y + config.detailHeight > maxY) {
                y = maxY - config.detailHeight;
            }
            renderDetailFrame(x, y, layerIndex);
            renderDetailHeading(x, y + Math.max(config.leftText.length, config.rightText.length) *
                DETAIL_BOX_HEIGHT, layerIndex, headIndex);
            renderDetailText(config.leftText, "leftText", posLeftText, y + DETAIL_PADDING, layerIndex);
            renderDetailAttn(posAttention, y + DETAIL_PADDING, att, layerIndex, headIndex);
            renderDetailText(config.rightText, "rightText", posRightText, y + DETAIL_PADDING, layerIndex);
        }

        function renderDetailHeading(x, y, layerIndex, headIndex) {
            var fillColor = getTextColor();
            config.svg.append("text")
                .classed("detail", true)
                .text('Layer ' + config.layers[layerIndex] + ", Head " + config.heads[headIndex])
                .attr("font-size", DETAIL_HEADING_TEXT_SIZE + "px")
                .style("cursor", "default")
                .style("-webkit-user-select", "none")
                .attr("fill", fillColor)
                .attr("x", x + DETAIL_WIDTH / 2)
                .attr("text-anchor", "middle")
                .attr("y", y + 40)
                .attr("height", DETAIL_HEADING_HEIGHT)
                .attr("width", DETAIL_WIDTH)
                .attr("dy", DETAIL_HEADING_TEXT_SIZE);
        }

        function renderDetailText(text, id, x, y, layerIndex) {
            var tokenContainer = config.svg.append("svg:g")
                .classed("detail", true)
                .selectAll("g")
                .data(text)
                .enter()
                .append("g");

            var fillColor = getTextColor();

            tokenContainer.append("rect")
                .classed("highlight", true)
                .attr("fill", fillColor)
                .style("opacity", 0.0)
                .attr("height", DETAIL_BOX_HEIGHT)
                .attr("width", DETAIL_BOX_WIDTH)
                .attr("x", x)
                .attr("y", function (d, i) {
                    return y + i * DETAIL_BOX_HEIGHT;
                });

            var textContainer = tokenContainer.append("text")
                .classed("token", true)
                .text(function (d) {
                    return d;
                })
                .attr("font-size", TEXT_SIZE + "px")
                .style("cursor", "default")
                .style("-webkit-user-select", "none")
                .attr("fill", fillColor)
                .attr("x", x)
                .attr("y", function (d, i) {
                    return i * DETAIL_BOX_HEIGHT + y;
                })
                .attr("height", DETAIL_BOX_HEIGHT)
                .attr("width", DETAIL_BOX_WIDTH)
                .attr("dy", TEXT_SIZE);

            if (id == "leftText") {
                textContainer.style("text-anchor", "end")
                    .attr("dx", DETAIL_BOX_WIDTH - 2);
                tokenContainer.on("mouseover", function (d, index) {
                    highlightSelection(index);
                });
                tokenContainer.on("mouseleave", function () {
                    unhighlightSelection();
                });
            }
        }

        function highlightSelection(index) {
            config.svg.select("#leftText")
                .selectAll(".highlight")
                .style("opacity", function (d, i) {
                    return i == index ? 1.0 : 0.0;
                });
            config.svg.selectAll(".attn-line-group")
                .style("opacity", function (d, i) {
                    return i == index ? 1.0 : 0.0;
                });
        }

        function unhighlightSelection() {
            config.svg.select("#leftText")
                .selectAll(".highlight")
                .style("opacity", 0.0);
            config.svg.selectAll(".attn-line-group")
                .style("opacity", 1);
        }

        function renderThumbnailAttn(x, y, att, layerIndex, headIndex) {

            var attnContainer = config.svg.append("svg:g");

            var attnBackground = attnContainer.append("rect")
                .attr("id", 'attn_background_' + layerIndex + "_" + headIndex)
                .classed("attn_background", true)
                .attr("x", x)
                .attr("y", y)
                .attr("height", config.thumbnailHeight)
                .attr("width", config.thumbnailWidth)
                .attr("stroke-width", 2)
                .attr("stroke", getLayerColor(layerIndex))
                .attr("stroke-opacity", 0)
                .attr("fill", getBackgroundColor());
            var x1 = x + THUMBNAIL_PADDING;
            var x2 = x1 + config.thumbnailWidth - 14;
            var y1 = y + THUMBNAIL_PADDING;

            attnContainer.selectAll("g")
                .data(att)
                .enter()
                .append("g") // Add group for each source token
                .attr("source-index", function (d, i) { // Save index of source token
                    return i;
                })
                .selectAll("line")
                .data(function (d) { // Loop over all target tokens
                    return d;
                })
                .enter() // When entering
                .append("line")
                .attr("x1", x1)
                .attr("y1", function (d) {
                    var sourceIndex = +this.parentNode.getAttribute("source-index");
                    return y1 + (sourceIndex + .5) * config.thumbnailBoxHeight;
                })
                .attr("x2", x2)
                .attr("y2", function (d, targetIndex) {
                    return y1 + (targetIndex + .5) * config.thumbnailBoxHeight;
                })
                .attr("stroke-width", 2.2)
                .attr("stroke", getLayerColor(layerIndex))
                .attr("stroke-opacity", function (d) {
                    return d;
                });

            var clickRegion = attnContainer.append("rect")
                .attr("x", x)
                .attr("y", y)
                .attr("height", config.thumbnailHeight)
                .attr("width", config.thumbnailWidth)
                .style("opacity", 0);

            clickRegion.on("click", function (d, index) {
                var attnBackgroundOther = config.svg.selectAll(".attn_background");
                attnBackgroundOther.attr("fill", getBackgroundColor());
                attnBackgroundOther.attr("stroke-opacity", 0);

                config.svg.selectAll(".detail").remove();
                if (config.detail_layer != layerIndex || config.detail_head != headIndex) {
                    renderDetail(att, layerIndex, headIndex);
                    config.detail_layer = layerIndex;
                    config.detail_head = headIndex;
                    attnBackground.attr("fill", getHighlightColor());
                    attnBackground.attr("stroke-opacity", .8);
                } else {
                    config.detail_layer = null;
                    config.detail_head = null;
                    attnBackground.attr("fill", getBackgroundColor());
                    attnBackground.attr("stroke-opacity", 0);
                }
            });

            clickRegion.on("mouseover", function (d) {
                d3.select(this).style("cursor", "pointer");
            });
        }

        function renderDetailFrame(x, y, layerIndex) {
            var detailFrame = config.svg.append("rect")
                .classed("detail", true)
                .attr("x", x)
                .attr("y", y)
                .attr("height", config.detailHeight)
                .attr("width", DETAIL_WIDTH)
                .style("opacity", 1)
                .attr("stroke-width", 1.5)
                .attr("stroke-opacity", 0.7)
                .attr("stroke", getLayerColor(layerIndex));
        }

        function renderDetailAttn(x, y, att, layerIndex) {
            var attnContainer = config.svg.append("svg:g")
                .classed("detail", true)
                .attr("pointer-events", "none");
            attnContainer.selectAll("g")
                .data(att)
                .enter()
                .append("g") // Add group for each source token
                .classed('attn-line-group', true)
                .attr("source-index", function (d, i) { // Save index of source token
                    return i;
                })
                .selectAll("line")
                .data(function (d) { // Loop over all target tokens
                    return d;
                })
                .enter()
                .append("line")
                .attr("x1", x + ATTN_PADDING)
                .attr("y1", function (d) {
                    var sourceIndex = +this.parentNode.getAttribute("source-index");
                    return y + (sourceIndex + .5) * DETAIL_BOX_HEIGHT;
                })
                .attr("x2", x + DETAIL_ATTENTION_WIDTH - ATTN_PADDING)
                .attr("y2", function (d, targetIndex) {
                    return y + (targetIndex + .5) * DETAIL_BOX_HEIGHT;
                })
                .attr("stroke-width", 2.2)
                .attr("stroke", getLayerColor(layerIndex))
                .attr("stroke-opacity", function (d) {
                    return d;
                });
        }

        function getLayerColor(layer) {
          return LAYER_COLORS[layer % 10];
        }

        function getTextColor() {
            return PALETTE[config.mode]['text']
        }

        function getBackgroundColor() {
           return PALETTE[config.mode]['background']
        }

        function getHighlightColor() {
           return PALETTE[config.mode]['highlight']
        }

        function initialize() {
            config.attention = params['attention'];
            config.filter = params['default_filter'];
            config.mode = params['display_mode'];
            config.layers = params['include_layers']
            config.heads = params['include_heads']
            config.totalHeads = params['total_heads']
            config.rootDivId = params['root_div_id'];
            $(`#${config.rootDivId} #filter`).on('change', function (e) {
                config.filter = e.currentTarget.value;
                render();
            });
        }

        initialize();
        render();

    });