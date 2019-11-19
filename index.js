(function () {
    const voteList = ('PK FK KZ KF K KF K K K K K K K K K K G GK GK GP G GZ G GZ GZ G GK GZ G G G G G G G G G ' +
        'G G G G GZ GZ GK GH G GZ G GK PG ZG ZG ZG KG KG KG GP G GK GP GF GK F F F F F F F F FZ ZF PF PF Z ZP ' +
        'ZH PZ HZ HZ Z P HP N N S S A')
        .split(' ')
        .filter(t => t !== 'A' && t !== 'S')
        .sort((a, b) => (a.length - b.length) || (a > b ? 1 : a < b ? -1 : 0))
        .map(v => v.split(''));
    const ballotCount = voteList.length;
    const endorsementThreshold = ballotCount * 2 / 3;
    const candidateNames = {
        F: 'Fanning',
        G: 'Grossman',
        H: 'Hernandez',
        K: 'Kennedy',
        P: 'Putta',
        Z: 'Zhang',
        N: 'No endorsement',
    };
    const defaultMoveTime = 500;
    const boxHeight = 16;
    const boxWidth = boxHeight;
    const boxGap = 0.1 * boxWidth;
    const candidateGap = boxHeight;
    const nameFontSize = 0.75 * boxHeight;
    const letterFontSize = 0.45 * boxHeight;
    const svgWidth = 1000;
    const maxBoxesPerRow = Math.floor((svgWidth - 7.3 * boxHeight) / (boxWidth - boxGap));
    const svg = makeSvgNode(
        'svg',
        {viewBox: `0,0 ${svgWidth},${svgWidth}`, width: '100%'},
        document.getElementById('figure-container')
    );
    const styleNode = makeSvgNode('style', {}, svg, '');

    class VoteBox {

        constructor(votes, pos) {
            const g = makeSvgNode(
                'g',
                {transform: `translate(${pos[0]},${pos[1]})`},
                svg
            );
            if (votes.length === 2) {
                makeSvgNode(
                    'polygon',
                    {
                        points: `0,0 ${boxWidth},0 0,${boxHeight}`,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'polygon',
                    {
                        points: `${boxWidth},0 ${boxWidth},${boxHeight} 0,${boxHeight}`,
                        class: votes[1],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.25 * boxWidth,
                        y: 0.25 * boxHeight + 0.55 * letterFontSize,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.75 * boxWidth,
                        y: 0.75 * boxHeight + 0.2 * letterFontSize,
                        class: 'letter',
                    },
                    g,
                    votes[1]
                );
            }
            else {
                makeSvgNode(
                    'rect',
                    {
                        width: boxWidth,
                        height: boxHeight,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.5 * boxWidth,
                        y: 0.5 * boxHeight + 0.3 * letterFontSize,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
            }
            makeSvgNode(
                'rect',
                {
                    width: boxWidth,
                    height: boxHeight,
                    class: 'border',
                },
                g
            );
            this.votes = votes;
            this.node = g;
            this.pos = pos;
            this.voteIndex = 0;
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

        moveTo(to, time = defaultMoveTime) {
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
        }

        addBox(box) {
            const that = this;
            const pos = [that.nextBoxX(), that.nextBoxY()];
            const isNew = !(box instanceof VoteBox);
            if (isNew) { // argument is votes
                box = new VoteBox(box, pos);
            }
            let promise = that.rowFull() ? that.expand(isNew ? 0 : 500) : Promise.resolve();
            that.incrementCount();
            if (!isNew) {
                promise = promise.then(() => box.moveTo(pos));
            }
            that.boxes.push(box);
            return promise;
        }

        removeBox(box) {
            this.boxes = this.boxes.filter(b => b !== box);
            this.decrementCount();
        }

        nextBoxX() {
            return 7.3 * boxHeight + (this.count % maxBoxesPerRow) * (boxWidth + boxGap);
        }

        nextBoxY() {
            return this.y + (this.boxRows() - (this.rowFull() ? 0 : 1)) * (boxHeight + boxGap);
        }

        rowFull() {
            return (this.count % maxBoxesPerRow) === 0 && this.count > 0;
        }

        boxRows() {
            return Math.max(0, Math.floor((this.count - 1) / maxBoxesPerRow)) + 1;
        }

        makeNode() {
            const x = 0;
            const y = this.y;
            return makeSvgNode(
                'g',
                {transform: `translate(${x},${y})`},
                svg
            );
        }

        makeNameNode() {
            return makeSvgNode(
                'text',
                {
                    x: 5.5 * boxHeight, // approx length of "No endorsement" plus a little padding
                    y: 1.1 * nameFontSize,
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
                    x: 6.8 * boxHeight,
                    y: 1.1 * nameFontSize,
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

        moveDown(amount, time = defaultMoveTime) {
            const fromY = this.y;
            this.y += amount;
            return Promise.all([
                ...this.boxes.map(b => b.moveTo([b.pos[0], b.pos[1] + amount], time)),
                moveNode(this.node, [0, fromY], [0, this.y], time),
            ]);
        }

        moveUp(amount, time = defaultMoveTime) {
            return this.moveDown(-amount, time);
        }

        expand(time = defaultMoveTime) {
            return this.collection.expandCandidate(this, time);
        }

        eliminate() {
            this.eliminated = true;
            const time = defaultMoveTime;
            const steps = Math.max(1, Math.round(time / 40));
            const node = this.node;
            return new Promise(function (resolve) {
                for (let i = 0; i < steps; i++) {
                    const frac = (i + 1) / steps;
                    const opacity = 1 - frac;
                    setTimeout(
                        function () {
                            node.setAttribute('style', `opacity: ${opacity}`);
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

    class CandidateCollection {

        constructor(candidateAbbrs) {
            const colors = ['#fb8072', '#8dd3c7', '#ffffb3', '#80b1d3', '#bebada', '#fdb462'];
            const collection = this;
            this.candidates = candidateAbbrs.map(function (abbr, i) {
                return new Candidate({
                    abbr,
                    index: i,
                    collection,
                    color: abbr === 'N' ? '#888888' : colors[i],
                    name: candidateNames[abbr],
                    y: i * (boxHeight + candidateGap),
                });
            });
            this.count = this.candidates.length;
            this.height = this.count * (boxHeight + candidateGap) - candidateGap;
            this.adjustSvgHeight();
        }

        remainingCandidates() {
            return this.all().filter(c => c.abbr !== 'N' && !c.eliminated);
        }

        sortedRemainingCandidates() {
            return this.remainingCandidates().sort(function (a, b) {
                return (b.count - a.count) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0);
            });
        }

        topCandidate() {
            return this.sortedRemainingCandidates()[0];
        }

        candidateY(i) {
            return this.get(i).index * (boxHeight + candidateGap);
        }

        bottomCandidate() {
            const sorted = this.sortedRemainingCandidates();
            return sorted[sorted.length - 1];
        }

        all() {
            return Object.values(this.candidates);
        }

        get(abbr) {
            return this.candidates.find(c => c.abbr === abbr || c.index === abbr);
        }

        expandCandidate(candidate, time = defaultMoveTime) {
            const distance = boxHeight + boxGap;
            this.height += distance;
            const promises = [];
            for (let i = candidate.index + 1; i < this.count; i++) {
                promises.push(this.get(i).moveDown(distance, time));
            }
            return Promise.all(promises)
                .then(() => this.adjustSvgHeight());
        }

        eliminateCandidate(candidate, time = defaultMoveTime) {
            const distance = candidate.boxRows() * (boxHeight + boxGap) - boxGap + candidateGap;
            this.height -= distance;
            const that = this;
            return candidate.eliminate()
                .then(function () {
                    const promises = [];
                    for (let i = candidate.index; i < that.count; i++) {
                        promises.push(that.get(i).moveUp(distance, time));
                    }
                    return Promise.all(promises);
                })
                .then(() => this.adjustSvgHeight());
        }

        adjustSvgHeight() {
            svg.setAttribute(
                'viewBox',
                svg.getAttribute('viewBox').replace(/[\d.]+$/, this.height + 1)
            );
        }

    }

    const candidateCollection = new CandidateCollection(Object.keys(candidateNames));
    insertStyle();
    Promise.all(
        voteList.map(votes => candidateCollection.get(votes[0]).addBox(votes))
    ).then(function () {
        const result = writeExplanation();
        if (result === true) {
            document.getElementById('play-button').addEventListener('click', () => doRounds(false));
            document.getElementById('forward-button').addEventListener('click', () => doRounds(true));
        }
        else {
            document.getElementById('play-button').disabled = true;
            document.getElementById('forward-button').disabled = true;
        }
    });

    function doRounds(keepGoing) {
        document.getElementById('play-button').disabled = true;
        document.getElementById('forward-button').disabled = true;
        const bottomCandidate = candidateCollection.bottomCandidate();
        document.getElementById('explanation1').innerHTML =
            `${bottomCandidate.name} is eliminated, and each of those ${bottomCandidate.count}
            votes is transferred to the second-choice candidate for that ballot. If there is no second choice, or
            if the second choice has already been eliminated, the vote is transferred to "No endorsement".`;
        document.getElementById('explanation2').innerHTML = '';
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
                    let toCandidate = candidateCollection.get(box.useNextChoice() || 'N');
                    if (toCandidate.eliminated) {
                        toCandidate = candidateCollection.get('N');
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
            .then(() => candidateCollection.eliminateCandidate(bottomCandidate))
            .then(function () {
                const result = writeExplanation();
                if (result !== true) {
                    return result;
                }
                if (keepGoing) {
                    return new Promise(function (resolve) {
                        setTimeout(() => resolve(doRounds(true)), defaultMoveTime);
                    });
                }
                document.getElementById('play-button').disabled = false;
                document.getElementById('forward-button').disabled = false;
                return true;
            });
    }

    function writeExplanation() {
        const sortedCandidates = candidateCollection.sortedRemainingCandidates();
        const topCandidate = sortedCandidates[0];
        const winner = topCandidate.count >= endorsementThreshold ? topCandidate : null;
        const explanation2 = document.getElementById('explanation2');
        const percent = (100 * topCandidate.count / ballotCount).toFixed(2);
        explanation2.innerHTML =
            `${topCandidate.name} has ${topCandidate.count} votes, or ${percent}%, ` +
            (winner ? 'and has reached' : 'short of') +
            ` the two thirds (${Math.ceil(endorsementThreshold)} votes) needed for endorsement. `;
        if (winner || sortedCandidates.length < 2) {
            explanation2.innerHTML += winner
                ? `<strong>${topCandidate.name} is endorsed.</strong>`
                : 'No candidates are left to be eliminated. <strong>There is no endorsement.</strong>';
            return winner;
        }
        const candidatesEliminated = candidateCollection.count - 1 - sortedCandidates.length;
        explanation2.innerHTML += candidatesEliminated
            ? 'The process continues.'
            : 'Second votes must be examined. Click a button to do one step or the entire process.';
        return true;
    }

    function insertStyle() {
        let styleContent = '';
        candidateCollection.all().forEach(c => styleContent += `.${c.abbr} { fill: ${c.color} }\n`);
        styleContent += `.letter { font-size: ${letterFontSize}px; fill: black; text-anchor: middle }\n` +
            `.name { font-size: ${nameFontSize}px; fill: black; text-anchor: end }\n` +
            `.count { font-size: ${nameFontSize}px; fill: blue; text-anchor: end }\n` +
            `.border { stroke-width: ${boxHeight / 25}px; stroke: #bbbbbb; fill: transparent; }\n`;
        styleNode.innerHTML = styleContent;
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

    function moveNode(node, from, to, time = defaultMoveTime) {
        const steps = Math.max(1, Math.round(time / 40));
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
