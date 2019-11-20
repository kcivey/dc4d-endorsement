(function () {
    const containerId = 'figure-container';
    const voteList = ('PK FK KZ KF K KF K K K K K K K K K K G GK GK GP G GZ G GZ GZ G GK GZ G G G G G G G G G ' +
        'G G G G GZ GZ GK GH G GZ G GK PG ZG ZG ZG KG KG KG GP G GK GP GF GK F F F F F F F F FZ ZF PF PF Z ZP ' +
        'ZH PZ HZ HZ Z P HP N N S S A')
        .split(' ')
        .filter(t => t !== 'A' && t !== 'S')
        .sort((a, b) => (a.length - b.length) || (a > b ? 1 : a < b ? -1 : 0))
        .map(v => v.split(''));
    const candidateNames = {
        F: 'Fanning',
        G: 'Grossman',
        H: 'Hernandez',
        K: 'Kennedy',
        P: 'Putta',
        Z: 'Zhang',
        N: 'No endorsement',
    };
    let moveTime = 500;
    let figure;
    document.getElementById('play-button').addEventListener('click', () => doRounds(false));
    document.getElementById('forward-button').addEventListener('click', () => doRounds(true));
    document.getElementById('reset-button').addEventListener('click', () => start(candidateNames, voteList));
    const speedControl = document.getElementById('speed-control');
    speedControl.addEventListener(
        'change',
        function () {
            moveTime = this.value;
        }
    );
    speedControl.setAttribute('min', 0);
    speedControl.setAttribute('max', 2000);
    speedControl.value = moveTime.toString();
    setExplanationHeight();

    class VoteBox {

        constructor(votes, pos, figure) {
            this.votes = votes;
            this.pos = pos;
            this.figure = figure;
            this.voteIndex = 0;
            this.width = figure.dimensions.boxWidth;
            this.height = figure.dimensions.boxHeight;
            this.node = this.makeNode();
        }

        makeNode() {
            const node = makeSvgNode(
                'g',
                {transform: `translate(${this.pos[0]},${this.pos[1]})`},
                this.figure.node
            );
            const letterFontSize = this.figure.dimensions.letterFontSize;
            if (this.votes.length === 2) {
                makeSvgNode(
                    'polygon',
                    {
                        points: `0,0 ${this.width},0 0,${this.height}`,
                        class: this.votes[0],
                    },
                    node
                );
                makeSvgNode(
                    'polygon',
                    {
                        points: `${this.width},0 ${this.width},${this.height} 0,${this.height}`,
                        class: this.votes[1],
                    },
                    node
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.25 * this.width,
                        y: 0.25 * this.height + 0.55 * letterFontSize,
                        class: 'letter',
                    },
                    node,
                    this.votes[0]
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.75 * this.width,
                        y: 0.75 * this.height + 0.2 * letterFontSize,
                        class: 'letter',
                    },
                    node,
                    this.votes[1]
                );
            }
            else {
                makeSvgNode(
                    'rect',
                    {
                        width: this.width,
                        height: this.height,
                        class: this.votes[0],
                    },
                    node
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.5 * this.width,
                        y: 0.5 * this.height + 0.3 * letterFontSize,
                        class: 'letter',
                    },
                    node,
                    this.votes[0]
                );
            }
            makeSvgNode(
                'rect',
                {
                    width: this.width,
                    height: this.height,
                    class: 'border',
                },
                node
            );
            return node;
        }

        currentChoice() {
            return this.votes[this.voteIndex];
        }

        useNextChoice() {
            this.voteIndex++;
            return this.currentChoice();
        }

        secondChoice() {
            return this.votes[1];
        }

        moveTo(to, time = moveTime) {
            const from = this.pos;
            this.pos = to;
            return moveNode(this.node, from, to, time);
        }

    }

    class Candidate {

        constructor(properties) {
            Object.assign(this, properties);
            this.count = 0;
            this.boxes = [];
            this.node = this.makeNode();
            this.nameNode = this.makeNameNode();
            this.countNode = this.makeCountNode();
            this.eliminated = false;
            this.maxBoxesPerRow = this.figure.maxBoxesPerRow;
        }

        addBox(box) {
            const pos = [this.nextBoxX(), this.nextBoxY()];
            const isNew = !(box instanceof VoteBox);
            if (isNew) { // argument is votes
                box = new VoteBox(box, pos, this.figure);
            }
            let promise = this.rowFull() ? this.expand(isNew ? 0 : 500) : Promise.resolve();
            this.incrementCount();
            if (!isNew) {
                promise = promise.then(() => box.moveTo(pos));
            }
            this.boxes.push(box);
            return promise;
        }

        removeBox(box) {
            this.boxes = this.boxes.filter(b => b !== box);
            this.decrementCount();
        }

        nextBoxX() {
            return 3 + this.figure.dimensions.nameWidth + 2 * this.figure.dimensions.columnGap +
                this.figure.dimensions.countWidth +
                (this.count % this.maxBoxesPerRow) *
                (3 + this.figure.dimensions.boxHeight + this.figure.dimensions.boxGap);
        }

        nextBoxY() {
            return this.y + (this.boxRows() - (this.rowFull() ? 0 : 1)) *
                (this.figure.dimensions.boxHeight + this.figure.dimensions.boxGap);
        }

        rowFull() {
            return (this.count % this.maxBoxesPerRow) === 0 && this.count > 0;
        }

        boxRows() {
            return Math.max(0, Math.floor((this.count - 1) / this.maxBoxesPerRow)) + 1;
        }

        makeNode() {
            const x = 0;
            const y = this.y;
            return makeSvgNode(
                'g',
                {transform: `translate(${x},${y})`},
                this.figure.node
            );
        }

        makeNameNode() {
            return makeSvgNode(
                'text',
                {
                    x: 3 + this.figure.dimensions.nameWidth,
                    y: 1.1 * this.figure.dimensions.nameFontSize,
                    class: 'name',
                },
                this.node,
                this.name
            );
        }

        makeCountNode() {
            return makeSvgNode(
                'text',
                {
                    x: 3 + this.figure.dimensions.nameWidth + this.figure.dimensions.columnGap +
                        this.figure.dimensions.countWidth,
                    y: 1.1 * this.figure.dimensions.nameFontSize,
                    class: 'count',
                },
                this.node,
                this.count.toString()
            );
        }

        incrementCount(amount = 1) {
            this.count += amount;
            this.updateCount();
        }

        decrementCount(amount = 1) {
            this.incrementCount(-amount);
        }

        updateCount() {
            this.countNode.innerHTML = this.count;
        }

        moveDown(amount, time = moveTime) {
            const fromY = this.y;
            this.y += amount;
            return Promise.all([
                ...this.boxes.map(b => b.moveTo([b.pos[0], b.pos[1] + amount], time)),
                moveNode(this.node, [0, fromY], [0, this.y], time),
            ]);
        }

        moveUp(amount, time = moveTime) {
            return this.moveDown(-amount, time);
        }

        expand(time = moveTime) {
            return this.figure.expandCandidate(this, time);
        }

        eliminate() {
            this.eliminated = true;
            const time = moveTime;
            const steps = Math.max(1, Math.round(time / 40));
            const node = this.node;
            return new Promise(function (resolve) {
                for (let i = 0; i < steps; i++) {
                    const frac = (i + 1) / steps;
                    const opacity = 1 - frac;
                    setTimeout(
                        function () {
                            node.style.opacity = opacity;
                            if (frac >= 1) {
                                node.remove();
                                resolve();
                            }
                        },
                        frac * time
                    );
                }
            });
        }

    }

    class EndorsementFigure {

        constructor(candidateNames, voteList) {
            const colors = ['#fb8072', '#8dd3c7', '#ffffb3', '#80b1d3', '#bebada', '#fdb462'];
            const candidateAbbrs = Object.keys(candidateNames);
            this.candidateCount = candidateAbbrs.length;
            this.width = 1000; // SVG units
            this.node = this.makeNode();
            this.setDimensions();
            const {boxHeight, candidateGap} = this.dimensions;
            const figure = this;
            this.candidates = candidateAbbrs
                .map(function (abbr, i) {
                    return new Candidate({
                        abbr,
                        index: i,
                        figure,
                        color: abbr === 'N' ? '#888888' : colors[i],
                        name: candidateNames[abbr],
                        y: i * (boxHeight + candidateGap),
                    });
                });
            this.addStyle();
            this.ballotCount = voteList.length;
            this.endorsementThreshold = this.ballotCount * 2 / 3;
            this.adjustSvgHeight();
            Promise.all(
                voteList.map(votes => figure.getCandidate(votes[0]).addBox(votes))
            ).then(writeExplanation);
        }

        setDimensions() {
            const pixelsPerUnit = this.node.clientWidth / this.width;
            const boxHeightPixels = Math.max(16 * pixelsPerUnit, 25);
            const boxHeight = boxHeightPixels / pixelsPerUnit;
            const boxWidth = boxHeight;
            const boxGap = 0.1 * boxWidth;
            const candidateGap = 0.8 * boxHeight;
            this.height = this.candidateCount * (boxHeight + candidateGap) - candidateGap;
            const nameFontSize = 0.6 * boxHeight;
            const nameWidth = getTextLength('No endorsement', this);
            const countWidth = getTextLength('99', this);
            const columnGap = boxWidth / 2;
            this.dimensions = {
                boxWidth,
                boxHeight,
                boxGap,
                candidateGap,
                nameFontSize,
                letterFontSize: 0.45 * boxHeight,
                strokeWidth: boxHeight / 25,
                nameWidth,
                countWidth,
                columnGap,
            };
            this.maxBoxesPerRow =
                Math.floor((this.width - (nameWidth + countWidth + 2 * columnGap)) / (boxWidth + boxGap));

            function getTextLength(text, that) {
                const dummyNode = makeSvgNode(
                    'text',
                    {x: -100, y: 0, class: 'name', 'font-size': nameFontSize + 'px'},
                    that.node,
                    text
                );
                const width = dummyNode.getComputedTextLength();
                that.node.removeChild(dummyNode);
                return width;
            }
        }

        makeNode() {
            if (window.innerWidth <= 576) {
                const animationNode = document.getElementById('animation');
                animationNode.style.marginLeft = '-12px';
                animationNode.style.marginRight = '-12px';
            }
            const containerNode = document.getElementById(containerId);
            let svg = containerNode.firstChild;
            if (svg) {
                while (svg.firstChild) {
                    svg.removeChild(svg.firstChild);
                }
            }
            else {
                svg = makeSvgNode(
                    'svg',
                    {viewBox: `0,0 ${this.width},${0.3 * this.width}`, width: '100%'},
                    containerNode
                );
            }
            return svg;
        }

        addStyle() {
            const {letterFontSize, nameFontSize, strokeWidth} = this.dimensions;
            let styleContent = '';
            this.allCandidates().forEach(c => styleContent += `.${c.abbr} { fill: ${c.color} }\n`);
            styleContent += `.letter { font-size: ${letterFontSize}px; fill: black; text-anchor: middle }\n` +
                `.name { font-size: ${nameFontSize}px; fill: black; text-anchor: end }\n` +
                `.count { font-size: ${nameFontSize}px; fill: blue; text-anchor: end }\n` +
                `.border { stroke-width: ${strokeWidth}px; stroke: #bbbbbb; fill: transparent; }\n`;
            const styleNode = makeSvgNode('style', {}, null, styleContent);
            this.node.prepend(styleNode);
        }

        remainingCandidates() {
            return this.allCandidates().filter(c => c.abbr !== 'N' && !c.eliminated);
        }

        sortedRemainingCandidates() {
            return this.remainingCandidates().sort(function (a, b) {
                return (b.count - a.count) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0);
            });
        }

        topCandidate() {
            return this.sortedRemainingCandidates()[0];
        }

        bottomCandidate() {
            const sorted = this.sortedRemainingCandidates();
            return sorted[sorted.length - 1];
        }

        allCandidates() {
            return Object.values(this.candidates);
        }

        getCandidate(abbr) {
            return this.candidates.find(c => c.abbr === abbr || c.index === abbr);
        }

        expandCandidate(candidate, time = moveTime) {
            const distance = this.dimensions.boxHeight + this.dimensions.boxGap;
            this.height += distance;
            const promises = [];
            for (let i = candidate.index + 1; i < this.candidateCount; i++) {
                promises.push(this.getCandidate(i).moveDown(distance, time));
            }
            return Promise.all(promises)
                .then(() => this.adjustSvgHeight());
        }

        eliminateCandidate(candidate, boxRows = 1, time = moveTime) {
            const distance = boxRows * (this.dimensions.boxHeight + this.dimensions.boxGap) -
                this.dimensions.boxGap + this.dimensions.candidateGap;
            this.height -= distance;
            const that = this;
            return candidate.eliminate()
                .then(function () {
                    const promises = [];
                    for (let i = candidate.index; i < that.candidateCount; i++) {
                        promises.push(that.getCandidate(i).moveUp(distance, time));
                    }
                    return Promise.all(promises);
                })
                .then(() => this.adjustSvgHeight());
        }

        adjustSvgHeight() {
            const wantedHeight = this.height + 1;
            const viewBox = this.node.getAttribute('viewBox');
            const svgHeight = viewBox.match(/[\d.]+$/)[0];
            if (svgHeight < wantedHeight) {
                this.node.setAttribute(
                    'viewBox',
                    viewBox.replace(/[\d.]+$/, this.height + 1)
                );
            }
        }

    }

    start(candidateNames, voteList);

    function start(candidateNames, voteList) {
        document.getElementById('play-button').disabled = false;
        document.getElementById('forward-button').disabled = false;
        document.getElementById('reset-button').disabled = true;
        figure = new EndorsementFigure(candidateNames, voteList);
    }

    function setExplanationHeight() {
        if (window.innerWidth <= 576) {
            document.getElementById('top-text').style.paddingBottom = '0';
        }
        const explanationNode = document.getElementById('explanation');
        explanationNode.innerHTML = // set dummy text
            `<span style="color: transparent">Xxxxxxxxxxxxx has 99 votes, short of the two thirds (99 votes)
            needed for endorsement. Second choices must be examined. Click a button to do one step or the
            entire process.</span>`;
        explanationNode.style.height = (explanationNode.clientHeight + 16) + 'px';
    }

    function doRounds(keepGoing) {
        document.getElementById('play-button').disabled = true;
        document.getElementById('forward-button').disabled = true;
        document.getElementById('reset-button').disabled = true;
        const bottomCandidate = figure.bottomCandidate();
        document.getElementById('explanation').innerHTML =
            `${bottomCandidate.name} is eliminated, and each of those ${bottomCandidate.count}
            votes is transferred to the second-choice candidate for that ballot (if not already eliminated)
            or to "No endorsement".`;
        const boxRows = bottomCandidate.boxRows(); // save to use later, after boxes have been removed
        const boxesToMove = [...bottomCandidate.boxes].reverse();
        const boxGroups = [];
        let prev = '';
        boxesToMove.forEach(function (box) {
            if (prev !== box.secondChoice()) {
                boxGroups.push([]);
            }
            boxGroups[boxGroups.length - 1].unshift(box);
            prev = box.secondChoice();
        });
        const tasks = boxGroups.map(function (boxGroup) {
            return function () {
                const promises = boxGroup.map(function (box) {
                    bottomCandidate.removeBox(box);
                    let toCandidate = figure.getCandidate(box.useNextChoice() || 'N');
                    if (toCandidate.eliminated) {
                        toCandidate = figure.getCandidate('N');
                    }
                    return toCandidate.addBox(box);
                });
                return Promise.all(promises);
            };
        });
        return tasks.reduce(
            (promiseChain, currentTask) => promiseChain.then(currentTask),
            Promise.resolve()
        )
            .then(() => figure.eliminateCandidate(bottomCandidate, boxRows))
            .then(function () {
                const result = writeExplanation();
                if (result !== true) {
                    document.getElementById('reset-button').disabled = false;
                    return result;
                }
                if (keepGoing) {
                    return new Promise(function (resolve) {
                        setTimeout(() => resolve(doRounds(true)), 3 * moveTime);
                    });
                }
                document.getElementById('play-button').disabled = false;
                document.getElementById('forward-button').disabled = false;
                document.getElementById('reset-button').disabled = false;
                return true;
            });
    }

    function writeExplanation() {
        const sortedCandidates = figure.sortedRemainingCandidates();
        const topCandidate = sortedCandidates[0];
        const winner = topCandidate.count >= figure.endorsementThreshold ? topCandidate : null;
        const explanationNode = document.getElementById('explanation');
        const percent = (100 * topCandidate.count / figure.ballotCount).toFixed(2);
        explanationNode.innerHTML =
            `${topCandidate.name} has ${topCandidate.count} votes, or ${percent}%, ` +
            (winner ? 'and has reached' : 'short of') +
            ` the two thirds (${Math.ceil(figure.endorsementThreshold)} votes) needed for endorsement. `;
        if (winner || sortedCandidates.length < 2) {
            explanationNode.innerHTML += winner
                ? `<strong>${topCandidate.name} is endorsed.</strong>`
                : 'No candidates are left to be eliminated. <strong>There is no endorsement.</strong>';
            document.getElementById('play-button').disabled = true;
            return winner;
        }
        const candidatesEliminated = figure.candidateCount - 1 - sortedCandidates.length;
        explanationNode.innerHTML += candidatesEliminated
            ? 'The process continues.'
            : 'Second choices must be examined. Click a button to do one step or the entire process.';
        return true;
    }

    function makeSvgNode(name, attr, parent, child) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', name);
        if (!attr) {
            attr = {};
        }
        Object.keys(attr).forEach(function (key) {
            node.setAttribute(key, attr[key]);
        });
        if (child) {
            node.appendChild(document.createTextNode(child));
        }
        if (parent) {
            parent.appendChild(node);
        }
        return node;
    }

    function moveNode(node, from, to, time = moveTime) {
        const steps = Math.max(1, Math.round(time / 20));
        return new Promise(function (resolve) {
            for (let i = 0; i < steps; i++) {
                const frac = easing((i + 1) / steps);
                const x = from[0] + frac * (to[0] - from[0]);
                const y = from[1] + frac * (to[1] - from[1]);
                setTimeout(
                    function () {
                        node.setAttribute('transform', `translate(${x},${y})`);
                        if (frac >= 1) {
                            resolve();
                        }
                    },
                    frac * time
                );
            }
        });

        function easing(t) {
            return 1 - Math.pow(1 - t, 3);
        }
    }
})();
