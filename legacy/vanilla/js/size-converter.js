/**
 * Size Conversion Utility
 * Handles conversion between UK, US, and EU shoe sizes
 */

class SizeConverter {
    /**
     * Convert size from one system to another
     * @param {number|string} size - Size value
     * @param {string} fromSystem - Source system ('UK', 'US', 'EU')
     * @param {string} toSystem - Target system ('UK', 'US', 'EU')
     * @returns {number} Converted size
     */
    static convert(size, fromSystem, toSystem) {
        if (fromSystem === toSystem) return parseInt(size);

        const sizeNum = parseInt(size);
        if (isNaN(sizeNum)) return size;

        const conversions = {
            'UK': {
                'US': (uk) => uk + 1,
                'EU': (uk) => uk + 33
            },
            'US': {
                'UK': (us) => us - 1,
                'EU': (us) => us + 32
            },
            'EU': {
                'UK': (eu) => eu - 33,
                'US': (eu) => eu - 32
            }
        };

        if (conversions[fromSystem] && conversions[fromSystem][toSystem]) {
            return conversions[fromSystem][toSystem](sizeNum);
        }

        return sizeNum;
    }

    /**
     * Convert size range (e.g., "UK 6-11" to "US 7-12")
     * @param {string} range - Size range string
     * @param {string} fromSystem - Source system
     * @param {string} toSystem - Target system
     * @returns {string} Converted range
     */
    static convertRange(range, fromSystem, toSystem) {
        const match = range.match(/(\w+)\s+(\d+)-(\d+)/);
        if (!match) return range;

        const [, system, start, end] = match;
        const startNum = parseInt(start);
        const endNum = parseInt(end);

        const convertedStart = this.convert(startNum, fromSystem, toSystem);
        const convertedEnd = this.convert(endNum, fromSystem, toSystem);

        return `${toSystem} ${convertedStart}-${convertedEnd}`;
    }

    /**
     * Get size chart data (UK, US, EU, foot length in cm)
     * @returns {Array} Size chart array
     */
    static getSizeChart() {
        return [
            { UK: 3, US: 4, EU: 36, footLength: 22.0 },
            { UK: 3.5, US: 4.5, EU: 36.5, footLength: 22.5 },
            { UK: 4, US: 5, EU: 37, footLength: 23.0 },
            { UK: 4.5, US: 5.5, EU: 37.5, footLength: 23.5 },
            { UK: 5, US: 6, EU: 38, footLength: 24.0 },
            { UK: 5.5, US: 6.5, EU: 38.5, footLength: 24.5 },
            { UK: 6, US: 7, EU: 39, footLength: 25.0 },
            { UK: 6.5, US: 7.5, EU: 40, footLength: 25.5 },
            { UK: 7, US: 8, EU: 40.5, footLength: 26.0 },
            { UK: 7.5, US: 8.5, EU: 41, footLength: 26.5 },
            { UK: 8, US: 9, EU: 42, footLength: 27.0 },
            { UK: 8.5, US: 9.5, EU: 42.5, footLength: 27.5 },
            { UK: 9, US: 10, EU: 43, footLength: 28.0 },
            { UK: 9.5, US: 10.5, EU: 43.5, footLength: 28.5 },
            { UK: 10, US: 11, EU: 44, footLength: 29.0 },
            { UK: 10.5, US: 11.5, EU: 44.5, footLength: 29.5 },
            { UK: 11, US: 12, EU: 45, footLength: 30.0 },
            { UK: 11.5, US: 12.5, EU: 45.5, footLength: 30.5 },
            { UK: 12, US: 13, EU: 46, footLength: 31.0 }
        ];
    }

    /**
     * Get recommended size based on foot length
     * @param {number} footLengthCm - Foot length in centimeters
     * @param {string} system - Size system ('UK', 'US', 'EU')
     * @returns {number} Recommended size
     */
    static getSizeFromLength(footLengthCm, system = 'UK') {
        const chart = this.getSizeChart();
        const entry = chart.find(e => e.footLength >= footLengthCm) || chart[chart.length - 1];

        switch (system) {
            case 'US':
                return entry.US;
            case 'EU':
                return entry.EU;
            default:
                return entry.UK;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SizeConverter;
}

window.SizeConverter = SizeConverter;

