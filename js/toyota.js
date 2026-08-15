/* ===========================================
   Toyota — Учёт лизинга автомобиля Toyota Corolla Cross (v1.1)
   =========================================== */

const Toyota = {
    DEFAULT_DATA: {
        contract: {
            assetName: 'TOYOTA COROLLA CROSS',
            contractNo: 'BT116176',
            bankName: 'Swedbank Lizingas',
            dealerName: 'Tokvila',
            totalPrice: 35300.00,
            downPaymentTotal: 8825.00,
            contractFee: 400.00,
            leasingPrincipal: 26475.00,
            totalInterest: 2601.57,
            totalDebt: 38301.57,
            rateDescription: '6 mėn. EURIBOR + 1.69% (3.81%)',
            startDate: '2026-10-15',
            paymentDay: 15
        },
        initialExpenses: [
            {
                id: 'init_tokvila',
                name: 'Аванс поставщику (Tokvila)',
                date: '2026-03-05',
                amount: 1000.00,
                paidBySergey: 1000.00,
                paidByIrina: 0.00,
                isDone: true,
                note: 'Внесено Сергеем при заказе'
            },
            {
                id: 'init_swedbank',
                name: 'Плата за договор (Swedbank Sutartis)',
                date: '2026-06-06',
                amount: 400.00,
                paidBySergey: 400.00,
                paidByIrina: 0.00,
                isDone: true,
                note: 'Внесено Сергеем банку'
            },
            {
                id: 'init_down_balance',
                name: 'Остаток 1-го взноса при получении авто',
                date: '2026-10-15',
                amount: 7825.00,
                sergeyTarget: 3212.50,
                irinaTarget: 4612.50,
                paidBySergey: 0.00,
                paidByIrina: 0.00,
                isDone: false,
                note: 'К оплате при выдаче автомобиля'
            }
        ],
        schedule: [
  {
    "num": 1,
    "date": "2026-10-15",
    "principal": 401.25,
    "interest": 42.03,
    "total": 443.28,
    "remaining": 26475.0,
    "irinaShare": 221.64,
    "sergeyShare": 221.64,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 2,
    "date": "2026-11-15",
    "principal": 402.53,
    "interest": 82.78,
    "total": 485.31,
    "remaining": 26073.75,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 3,
    "date": "2026-12-15",
    "principal": 403.8,
    "interest": 81.51,
    "total": 485.31,
    "remaining": 25671.22,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 4,
    "date": "2027-01-15",
    "principal": 405.09,
    "interest": 80.22,
    "total": 485.31,
    "remaining": 25267.42,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 5,
    "date": "2027-02-15",
    "principal": 406.37,
    "interest": 78.94,
    "total": 485.31,
    "remaining": 24862.33,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 6,
    "date": "2027-03-15",
    "principal": 407.66,
    "interest": 77.65,
    "total": 485.31,
    "remaining": 24455.96,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 7,
    "date": "2027-04-15",
    "principal": 408.96,
    "interest": 76.35,
    "total": 485.31,
    "remaining": 24048.3,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 8,
    "date": "2027-05-15",
    "principal": 410.26,
    "interest": 75.05,
    "total": 485.31,
    "remaining": 23639.34,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 9,
    "date": "2027-06-15",
    "principal": 411.56,
    "interest": 73.75,
    "total": 485.31,
    "remaining": 23229.08,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 10,
    "date": "2027-07-15",
    "principal": 412.86,
    "interest": 72.45,
    "total": 485.31,
    "remaining": 22817.52,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 11,
    "date": "2027-08-15",
    "principal": 414.18,
    "interest": 71.13,
    "total": 485.31,
    "remaining": 22404.66,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 12,
    "date": "2027-09-15",
    "principal": 415.49,
    "interest": 69.82,
    "total": 485.31,
    "remaining": 21990.48,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 13,
    "date": "2027-10-15",
    "principal": 416.81,
    "interest": 68.5,
    "total": 485.31,
    "remaining": 21574.99,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 14,
    "date": "2027-11-15",
    "principal": 418.13,
    "interest": 67.18,
    "total": 485.31,
    "remaining": 21158.18,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 15,
    "date": "2027-12-15",
    "principal": 419.46,
    "interest": 65.85,
    "total": 485.31,
    "remaining": 20740.05,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 16,
    "date": "2028-01-15",
    "principal": 420.79,
    "interest": 64.52,
    "total": 485.31,
    "remaining": 20320.59,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 17,
    "date": "2028-02-15",
    "principal": 422.13,
    "interest": 63.18,
    "total": 485.31,
    "remaining": 19899.8,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 18,
    "date": "2028-03-15",
    "principal": 423.47,
    "interest": 61.84,
    "total": 485.31,
    "remaining": 19477.67,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 19,
    "date": "2028-04-15",
    "principal": 424.81,
    "interest": 60.5,
    "total": 485.31,
    "remaining": 19054.2,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 20,
    "date": "2028-05-15",
    "principal": 426.16,
    "interest": 59.15,
    "total": 485.31,
    "remaining": 18629.39,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 21,
    "date": "2028-06-15",
    "principal": 427.51,
    "interest": 57.8,
    "total": 485.31,
    "remaining": 18203.23,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 22,
    "date": "2028-07-15",
    "principal": 428.87,
    "interest": 56.44,
    "total": 485.31,
    "remaining": 17775.72,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 23,
    "date": "2028-08-15",
    "principal": 430.23,
    "interest": 55.08,
    "total": 485.31,
    "remaining": 17346.85,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 24,
    "date": "2028-09-15",
    "principal": 431.6,
    "interest": 53.71,
    "total": 485.31,
    "remaining": 16916.62,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 25,
    "date": "2028-10-15",
    "principal": 432.97,
    "interest": 52.34,
    "total": 485.31,
    "remaining": 16485.02,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 26,
    "date": "2028-11-15",
    "principal": 434.34,
    "interest": 50.97,
    "total": 485.31,
    "remaining": 16052.05,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 27,
    "date": "2028-12-15",
    "principal": 435.72,
    "interest": 49.59,
    "total": 485.31,
    "remaining": 15617.71,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 28,
    "date": "2029-01-15",
    "principal": 437.11,
    "interest": 48.2,
    "total": 485.31,
    "remaining": 15181.99,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 29,
    "date": "2029-02-15",
    "principal": 438.5,
    "interest": 46.81,
    "total": 485.31,
    "remaining": 14744.88,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 30,
    "date": "2029-03-15",
    "principal": 439.89,
    "interest": 45.42,
    "total": 485.31,
    "remaining": 14306.38,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 31,
    "date": "2029-04-15",
    "principal": 441.28,
    "interest": 44.03,
    "total": 485.31,
    "remaining": 13866.49,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 32,
    "date": "2029-05-15",
    "principal": 442.68,
    "interest": 42.63,
    "total": 485.31,
    "remaining": 13425.21,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 33,
    "date": "2029-06-15",
    "principal": 444.09,
    "interest": 41.22,
    "total": 485.31,
    "remaining": 12982.53,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 34,
    "date": "2029-07-15",
    "principal": 445.5,
    "interest": 39.81,
    "total": 485.31,
    "remaining": 12538.44,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 35,
    "date": "2029-08-15",
    "principal": 446.91,
    "interest": 38.4,
    "total": 485.31,
    "remaining": 12092.94,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 36,
    "date": "2029-09-15",
    "principal": 448.33,
    "interest": 36.98,
    "total": 485.31,
    "remaining": 11646.03,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 37,
    "date": "2029-10-15",
    "principal": 449.76,
    "interest": 35.55,
    "total": 485.31,
    "remaining": 11197.7,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 38,
    "date": "2029-11-15",
    "principal": 451.19,
    "interest": 34.12,
    "total": 485.31,
    "remaining": 10747.94,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 39,
    "date": "2029-12-15",
    "principal": 452.62,
    "interest": 32.69,
    "total": 485.31,
    "remaining": 10296.75,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 40,
    "date": "2030-01-15",
    "principal": 454.05,
    "interest": 31.26,
    "total": 485.31,
    "remaining": 9844.13,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 41,
    "date": "2030-02-15",
    "principal": 455.5,
    "interest": 29.81,
    "total": 485.31,
    "remaining": 9390.08,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 42,
    "date": "2030-03-15",
    "principal": 456.94,
    "interest": 28.37,
    "total": 485.31,
    "remaining": 8934.58,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 43,
    "date": "2030-04-15",
    "principal": 458.39,
    "interest": 26.92,
    "total": 485.31,
    "remaining": 8477.64,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 44,
    "date": "2030-05-15",
    "principal": 459.85,
    "interest": 25.46,
    "total": 485.31,
    "remaining": 8019.25,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 45,
    "date": "2030-06-15",
    "principal": 461.31,
    "interest": 24.0,
    "total": 485.31,
    "remaining": 7559.4,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 46,
    "date": "2030-07-15",
    "principal": 462.77,
    "interest": 22.54,
    "total": 485.31,
    "remaining": 7098.09,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 47,
    "date": "2030-08-15",
    "principal": 464.24,
    "interest": 21.07,
    "total": 485.31,
    "remaining": 6635.32,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 48,
    "date": "2030-09-15",
    "principal": 465.72,
    "interest": 19.59,
    "total": 485.31,
    "remaining": 6171.08,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 49,
    "date": "2030-10-15",
    "principal": 467.2,
    "interest": 18.11,
    "total": 485.31,
    "remaining": 5705.36,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 50,
    "date": "2030-11-15",
    "principal": 468.68,
    "interest": 16.63,
    "total": 485.31,
    "remaining": 5238.16,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 51,
    "date": "2030-12-15",
    "principal": 470.17,
    "interest": 15.14,
    "total": 485.31,
    "remaining": 4769.48,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 52,
    "date": "2031-01-15",
    "principal": 471.66,
    "interest": 13.65,
    "total": 485.31,
    "remaining": 4299.31,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 53,
    "date": "2031-02-15",
    "principal": 473.16,
    "interest": 12.15,
    "total": 485.31,
    "remaining": 3827.65,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 54,
    "date": "2031-03-15",
    "principal": 474.66,
    "interest": 10.65,
    "total": 485.31,
    "remaining": 3354.49,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 55,
    "date": "2031-04-15",
    "principal": 476.17,
    "interest": 9.14,
    "total": 485.31,
    "remaining": 2879.83,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 56,
    "date": "2031-05-15",
    "principal": 477.68,
    "interest": 7.63,
    "total": 485.31,
    "remaining": 2403.66,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 57,
    "date": "2031-06-15",
    "principal": 479.2,
    "interest": 6.11,
    "total": 485.31,
    "remaining": 1925.98,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 58,
    "date": "2031-07-15",
    "principal": 480.72,
    "interest": 4.59,
    "total": 485.31,
    "remaining": 1446.78,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 59,
    "date": "2031-08-15",
    "principal": 482.24,
    "interest": 3.07,
    "total": 485.31,
    "remaining": 966.06,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  },
  {
    "num": 60,
    "date": "2031-09-15",
    "principal": 483.82,
    "interest": 1.49,
    "total": 485.31,
    "remaining": 483.82,
    "irinaShare": 242.66,
    "sergeyShare": 242.65,
    "irinaPaid": false,
    "bankPaid": false
  }
]
    },

    data: null,
    currentFilter: 'all', // 'all', 'pending', 'paid'

    init() {
        const saved = Storage.get('toyota_data');
        if (saved && saved.contract && saved.schedule && saved.schedule.length > 0) {
            this.data = saved;
        } else {
            this.data = JSON.parse(JSON.stringify(this.DEFAULT_DATA));
            this.save();
        }
    },

    save() {
        Storage.set('toyota_data', this.data);
    },

    /* --- Расчёт статистики и баланса 50/50 --- */

    calcStats() {
        const d = this.data;
        const totalCommitment = d.contract.totalDebt; // 38301.57
        const halfShare = +(totalCommitment / 2).toFixed(2); // 19150.78

        // Стартовые выплаты
        let sergeyInitialPaid = 0;
        let irinaInitialPaid = 0;
        d.initialExpenses.forEach(exp => {
            sergeyInitialPaid += (exp.paidBySergey || 0);
            irinaInitialPaid += (exp.paidByIrina || 0);
        });

        // Ежемесячные платежи
        let sergeyMonthlyPaid = 0;
        let irinaMonthlyPaid = 0;
        let totalMonthlyPaid = 0;
        let paidMonthsCount = 0;

        d.schedule.forEach(row => {
            if (row.bankPaid) {
                totalMonthlyPaid += row.total;
                sergeyMonthlyPaid += (row.sergeyShare || 0);
                paidMonthsCount++;
            }
            if (row.irinaPaid) {
                irinaMonthlyPaid += (row.irinaShare || 0);
            }
        });

        const totalPaidOverall = sergeyInitialPaid + irinaInitialPaid + totalMonthlyPaid;
        const totalRemainingOverall = Math.max(0, totalCommitment - totalPaidOverall);
        const overallProgress = Math.min(100, (totalPaidOverall / totalCommitment) * 100);

        const sergeyTotalPaid = sergeyInitialPaid + sergeyMonthlyPaid;
        const sergeyRemaining = Math.max(0, halfShare - sergeyTotalPaid);
        const sergeyProgress = Math.min(100, (sergeyTotalPaid / halfShare) * 100);

        const irinaTotalPaid = irinaInitialPaid + irinaMonthlyPaid;
        const irinaRemaining = Math.max(0, halfShare - irinaTotalPaid);
        const irinaProgress = Math.min(100, (irinaTotalPaid / halfShare) * 100);

        return {
            totalCommitment,
            halfShare,
            totalPaidOverall,
            totalRemainingOverall,
            overallProgress,
            sergeyInitialPaid,
            irinaInitialPaid,
            sergeyMonthlyPaid,
            irinaMonthlyPaid,
            sergeyTotalPaid,
            sergeyRemaining,
            sergeyProgress,
            irinaTotalPaid,
            irinaRemaining,
            irinaProgress,
            paidMonthsCount,
            totalMonthsCount: d.schedule.length
        };
    },

    /* --- Рендеринг страницы --- */

    render() {
        const stats = this.calcStats();
        const d = this.data;

        // Фильтрация строк расписания
        let filteredSchedule = d.schedule;
        if (this.currentFilter === 'pending') {
            filteredSchedule = d.schedule.filter(s => !s.bankPaid || !s.irinaPaid);
        } else if (this.currentFilter === 'paid') {
            filteredSchedule = d.schedule.filter(s => s.bankPaid);
        }

        return `
            <!-- Верхняя информационная панель автомобиля -->
            <div style="background: linear-gradient(135deg, rgba(30, 39, 46, 0.95), rgba(47, 53, 66, 0.95)); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 18px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:24px;">🚗</span>
                            <h2 style="font-size:18px; font-weight:700; color:var(--text-primary); margin:0;">${d.contract.assetName}</h2>
                            <span style="background:rgba(46,213,115,0.2); color:var(--color-success); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600;">Лизинг 5 лет</span>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                            Договор № <strong>${d.contract.contractNo}</strong> (${d.contract.bankName}) | Поставщик: <strong>${d.contract.dealerName}</strong>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" id="btn-toyota-shift-dates">
                            📅 Сдвинуть график (${formatDate(d.contract.startDate)})
                        </button>
                        <button class="btn btn-secondary btn-sm" id="btn-toyota-settings">
                            ⚙️ Параметры
                        </button>
                    </div>
                </div>

                <!-- Общий прогресс-бар выплат -->
                <div style="margin-top: 14px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
                        <span style="color:var(--text-secondary);">Общий прогресс погашения (с процентами и взносами):</span>
                        <span style="font-weight:700; color:var(--text-primary);">${formatMoney(stats.totalPaidOverall)} / ${formatMoney(stats.totalCommitment)} (${stats.overallProgress.toFixed(1)}%)</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.08); height:10px; border-radius:5px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #2ed573, #1e90ff); height:100%; width:${stats.overallProgress}%; transition:width 0.4s ease;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <span>Выплачено месяцев: <strong>${stats.paidMonthsCount} из ${stats.totalMonthsCount}</strong></span>
                        <span>Остаток долга: <strong style="color:var(--color-danger);">${formatMoney(stats.totalRemainingOverall)}</strong></span>
                    </div>
                </div>
            </div>

            <!-- Карточки распределения 50/50 -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                
                <!-- Карточка Сергея (50%) -->
                <div style="background: var(--bg-card); border: 1px solid rgba(30, 144, 255, 0.3); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="font-size:14px; font-weight:700; color:#1e90ff; display:flex; align-items:center; gap:6px;">
                            <span>👤 Сергей</span>
                            <span style="font-size:11px; background:rgba(30,144,255,0.15); color:#1e90ff; padding:1px 6px; border-radius:10px;">50%</span>
                        </div>
                        <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${formatMoney(stats.halfShare)}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                        <span style="color:var(--text-muted);">Оплачено всего:</span>
                        <span style="font-weight:700; color:var(--color-success);">${formatMoney(stats.sergeyTotalPaid)}</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px; padding-left:8px; border-left:2px solid rgba(30,144,255,0.3);">
                        • Аванс и договор: ${formatMoney(stats.sergeyInitialPaid)}<br>
                        • Ежемесячные платежи: ${formatMoney(stats.sergeyMonthlyPaid)}
                    </div>

                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
                        <span style="color:var(--text-muted);">Остаток к оплате:</span>
                        <span style="font-weight:700; color:var(--color-danger);">${formatMoney(stats.sergeyRemaining)}</span>
                    </div>

                    <div style="background:rgba(255,255,255,0.08); height:6px; border-radius:3px; overflow:hidden;">
                        <div style="background:#1e90ff; height:100%; width:${stats.sergeyProgress}%;"></div>
                    </div>
                </div>

                <!-- Карточка Ирины (50%) -->
                <div style="background: var(--bg-card); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <div style="font-size:14px; font-weight:700; color:#ff4757; display:flex; align-items:center; gap:6px;">
                            <span>👩 Ирина</span>
                            <span style="font-size:11px; background:rgba(255,71,87,0.15); color:#ff4757; padding:1px 6px; border-radius:10px;">50%</span>
                        </div>
                        <span style="font-size:13px; font-weight:700; color:var(--text-primary);">${formatMoney(stats.halfShare)}</span>
                    </div>
                    
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                        <span style="color:var(--text-muted);">Оплачено всего:</span>
                        <span style="font-weight:700; color:var(--color-success);">${formatMoney(stats.irinaTotalPaid)}</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px; padding-left:8px; border-left:2px solid rgba(255,71,87,0.3);">
                        • Первый взнос: ${formatMoney(stats.irinaInitialPaid)}<br>
                        • Переведено на банк: ${formatMoney(stats.irinaMonthlyPaid)}
                    </div>

                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
                        <span style="color:var(--text-muted);">Остаток к оплате:</span>
                        <span style="font-weight:700; color:var(--color-danger);">${formatMoney(stats.irinaRemaining)}</span>
                    </div>

                    <div style="background:rgba(255,255,255,0.08); height:6px; border-radius:3px; overflow:hidden;">
                        <div style="background:#ff4757; height:100%; width:${stats.irinaProgress}%;"></div>
                    </div>
                </div>

            </div>

            <!-- Блок 1: Стартовые расходы (Аванс, Договор и 1-й взнос) -->
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="card-title" style="display:flex; align-items:center; gap:8px;">
                        <span>📋</span>
                        <span>1. Первоначальные расходы и Первый взнос (до старта выплат)</span>
                    </div>
                    <span style="font-size:12px; color:var(--text-muted);">Всего: <strong>9 225.00 €</strong> (по 4 612.50 €)</span>
                </div>

                <div class="table-container" style="overflow-x:auto;">
                    <table class="toyota-table">
                        <thead>
                            <tr>
                                <th style="width: 120px;">Дата</th>
                                <th style="min-width: 260px;">Назначение платежа</th>
                                <th style="min-width: 130px;">Сумма</th>
                                <th style="min-width: 150px;">Сергей (50%)</th>
                                <th style="min-width: 150px;">Ирина (50%)</th>
                                <th style="min-width: 130px;">Статус</th>
                                <th style="width: 110px; text-align:center;">Действие</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.initialExpenses.map(exp => `
                                <tr>
                                    <td style="font-weight:600; white-space:nowrap; vertical-align:top; padding-top:16px;">
                                        ${formatDate(exp.date)}
                                    </td>
                                    <td style="vertical-align:top;">
                                        <div class="toyota-cell-title">${exp.name}</div>
                                        <div class="toyota-cell-subtitle">${exp.note || ''}</div>
                                    </td>
                                    <td style="font-weight:700; color:var(--text-primary); white-space:nowrap; vertical-align:top; padding-top:16px;">
                                        ${formatMoney(exp.amount)}
                                    </td>
                                    <td style="white-space:nowrap; vertical-align:top; padding-top:16px;">
                                        <span style="color:${exp.paidBySergey > 0 ? 'var(--color-success)' : 'var(--text-muted)'}; font-weight:600;">
                                            ${formatMoney(exp.paidBySergey || 0)}
                                        </span>
                                    </td>
                                    <td style="white-space:nowrap; vertical-align:top; padding-top:16px;">
                                        <span style="color:${exp.paidByIrina > 0 ? 'var(--color-success)' : 'var(--text-muted)'}; font-weight:600;">
                                            ${formatMoney(exp.paidByIrina || 0)}
                                        </span>
                                    </td>
                                    <td style="vertical-align:top; padding-top:14px; white-space:nowrap;">
                                        ${exp.isDone 
                                            ? '<span class="status-badge status-paid">✅ Оплачено</span>'
                                            : '<span class="status-badge status-pending">⏳ К оплате</span>'
                                        }
                                    </td>
                                    <td style="text-align:center; vertical-align:top; padding-top:12px;">
                                        <button class="btn btn-secondary btn-sm" onclick="Toyota.showInitialPaymentModal('${exp.id}')">
                                            ✏️ ${exp.isDone ? 'Изменить' : 'Внести'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Блок 2: График 60 ежемесячных платежей -->
            <div class="card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div class="card-title" style="display:flex; align-items:center; gap:8px;">
                        <span>📅</span>
                        <span>2. График ежемесячных платежей (60 месяцев)</span>
                    </div>

                    <!-- Вкладки фильтрации -->
                    <div style="display:flex; gap:6px; background:var(--bg-card-hover); padding:3px; border-radius:var(--radius-sm);">
                        <button class="btn btn-sm ${this.currentFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="Toyota.setFilter('all')">
                            Все (${d.schedule.length})
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}" onclick="Toyota.setFilter('pending')">
                            Ожидают (${d.schedule.filter(s => !s.bankPaid).length})
                        </button>
                        <button class="btn btn-sm ${this.currentFilter === 'paid' ? 'btn-primary' : 'btn-secondary'}" onclick="Toyota.setFilter('paid')">
                            Оплачено (${stats.paidMonthsCount})
                        </button>
                    </div>
                </div>

                <div class="table-container" style="overflow-x:auto;">
                    <table class="toyota-table">
                        <thead>
                            <tr>
                                <th style="width:50px;">№</th>
                                <th style="width:110px;">Дата</th>
                                <th style="min-width:130px;">Платёж банку</th>
                                <th style="min-width:140px; font-size:11px; color:var(--text-muted);">Тело / %</th>
                                <th style="min-width:150px;">Ирина (50%)</th>
                                <th style="min-width:150px;">Списание Банк</th>
                                <th style="min-width:130px;">Остаток долга</th>
                                <th style="width:70px; text-align:center;">Опции</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSchedule.map(row => `
                                <tr style="${row.bankPaid ? 'background:rgba(46,213,115,0.04);' : ''}">
                                    <td style="color:var(--text-muted); font-size:12px; vertical-align:middle;">${row.num}</td>
                                    <td style="font-weight:600; white-space:nowrap; vertical-align:middle;">
                                        ${formatDate(row.date)}
                                    </td>
                                    <td style="font-weight:700; color:var(--text-primary); white-space:nowrap; vertical-align:middle;">
                                        ${formatMoney(row.total)}
                                    </td>
                                    <td style="font-size:11px; color:var(--text-muted); white-space:nowrap; vertical-align:middle;">
                                        ${row.principal.toFixed(2)} + <span style="color:#ffa502;">${row.interest.toFixed(2)}</span>
                                    </td>
                                    
                                    <!-- Статус доли Ирины -->
                                    <td style="vertical-align:middle;">
                                        ${row.irinaPaid 
                                            ? `<span class="status-badge status-paid" title="Получено от Ирины: ${formatMoney(row.irinaShare)}" onclick="Toyota.showIrinaPaymentModal(${row.num})" style="cursor:pointer;">
                                                ✅ ${formatMoney(row.irinaShare)}
                                               </span>`
                                            : `<button class="btn btn-secondary btn-sm" onclick="Toyota.showIrinaPaymentModal(${row.num})" style="font-size:11px; padding:3px 8px;">
                                                + ${formatMoney(row.irinaShare)}
                                               </button>`
                                        }
                                    </td>

                                    <!-- Статус списания банком -->
                                    <td style="vertical-align:middle;">
                                        ${row.bankPaid 
                                            ? `<span class="status-badge status-paid" title="Оплачено банку: ${formatMoney(row.total)}" onclick="Toyota.showBankPaymentModal(${row.num})" style="cursor:pointer;">
                                                ✅ Оплачено
                                               </span>`
                                            : `<button class="btn btn-primary btn-sm" onclick="Toyota.showBankPaymentModal(${row.num})" style="font-size:11px; padding:3px 8px;">
                                                💸 Оплатить банку
                                               </button>`
                                        }
                                    </td>

                                    <td style="font-size:12px; color:var(--text-secondary); font-family:monospace; vertical-align:middle;">
                                        ${formatMoney(row.remaining)}
                                    </td>

                                    <td style="text-align:center; vertical-align:middle;">
                                        <button class="btn-icon" title="Редактировать платёж" onclick="Toyota.showEditMonthModal(${row.num})" style="font-size:12px;">
                                            ✏️
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    afterRender() {
        document.getElementById('btn-toyota-shift-dates')?.addEventListener('click', () => {
            this.showShiftDatesModal();
        });
        document.getElementById('btn-toyota-settings')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
    },

    setFilter(filter) {
        this.currentFilter = filter;
        if (typeof App !== 'undefined') App.renderPage();
    },

    /* --- Модальное окно: Сдвиг графика при прибытии авто --- */

    showShiftDatesModal() {
        const curStart = this.data.contract.startDate || '2026-10-15';
        
        App.showModal('📅 Сдвинуть даты графика платежей', `
            <div style="margin-bottom: 16px;">
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                    Когда автомобиль прибудет из Японии и банк назначит дату первого списания, укажите её здесь. 
                    Все 60 ежемесячных платежей автоматически сместятся на соответствующие числа!
                </p>
                <div class="form-group">
                    <label class="form-label">Дата 1-го платежа (Месяц №1):</label>
                    <input type="text" id="input-shift-start-date" class="form-input custom-datepicker" value="${curStart}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                <button type="button" class="btn btn-primary" id="btn-confirm-shift-dates">Применить сдвиг графика</button>
            </div>
        `);

        document.getElementById('btn-confirm-shift-dates')?.addEventListener('click', () => {
            const newStartDate = document.getElementById('input-shift-start-date')?.value;
            if (!newStartDate) return alert('Укажите дату!');
            
            this.shiftScheduleDates(newStartDate);
            App.closeModal();
            App.renderPage();
            if (typeof Storage !== 'undefined') Storage.showSyncToast('График Toyota успешно обновлён 🚗');
        });
    },

    shiftScheduleDates(newStartDateStr) {
        const [startY, startM, startD] = newStartDateStr.split('-').map(Number);
        this.data.contract.startDate = newStartDateStr;
        this.data.contract.paymentDay = startD;

        // Обновляем даты всех 60 платежей
        this.data.schedule.forEach((row, idx) => {
            const dateObj = new Date(startY, (startM - 1) + idx, startD);
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            row.date = `${y}-${m}-${d}`;
        });

        // Также обновляем предполагаемую дату доплаты первого взноса
        if (this.data.initialExpenses[2]) {
            this.data.initialExpenses[2].date = newStartDateStr;
        }

        this.save();
    },

    /* --- Модальное окно: Оплата от Ирины --- */

    showIrinaPaymentModal(monthNum) {
        const row = this.data.schedule.find(s => s.num === monthNum);
        if (!row) return;

        const isAlreadyPaid = row.irinaPaid;
        const curDate = row.irinaPaidDate || new Date().toISOString().slice(0, 10);

        App.showModal(`👩 Взнос от Ирины за платёж №${row.num}`, `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                    Платёж за <strong>${formatDate(row.date)}</strong>. Доля Ирины (50%): <strong style="color:var(--text-primary); font-size:15px;">${formatMoney(row.irinaShare)}</strong>
                </div>

                <div class="form-group">
                    <label class="form-label">Дата получения перевода:</label>
                    <input type="text" id="input-irina-pay-date" class="form-input custom-datepicker" value="${curDate}">
                </div>

                <div style="background:var(--bg-card-hover); padding:12px; border-radius:var(--radius); margin-bottom:12px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:600;">
                        <input type="checkbox" id="check-irina-add-income" ${!isAlreadyPaid ? 'checked' : ''}>
                        <span>Зачислить на счёт «Банк» (+${formatMoney(row.irinaShare)})</span>
                    </label>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px; padding-left:24px;">
                        Автоматически создаст входящий перевод на ваш банковский счёт от жены.
                    </div>
                </div>
            </div>

            <div class="form-actions">
                ${isAlreadyPaid ? `<button type="button" class="btn btn-danger" id="btn-irina-cancel">Снять отметку</button>` : ''}
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Закрыть</button>
                <button type="button" class="btn btn-primary" id="btn-irina-confirm">
                    ${isAlreadyPaid ? 'Сохранить изменения' : '✅ Подтвердить получение'}
                </button>
            </div>
        `);

        document.getElementById('btn-irina-confirm')?.addEventListener('click', () => {
            const payDate = document.getElementById('input-irina-pay-date')?.value || row.date;
            const addIncome = document.getElementById('check-irina-add-income')?.checked;

            row.irinaPaid = true;
            row.irinaPaidDate = payDate;

            // Если выбран чекбокс — добавляем доход в Журнал на счёт Банк
            if (addIncome && typeof Journal !== 'undefined' && typeof Accounts !== 'undefined') {
                const bankAcc = Accounts.getAll().find(a => a.name === 'Банк') || Accounts.getDefault();
                if (bankAcc) {
                    const incCategory = Categories.getAll('income')[0];
                    Journal.addTransaction({
                        date: payDate,
                        type: 'income',
                        amount: row.irinaShare,
                        accountId: bankAcc.id,
                        categoryId: incCategory ? incCategory.id : null,
                        note: `50% лизинг Toyota от Ирины (№${row.num})`
                    });
                }
            }

            this.save();
            App.closeModal();
            App.renderPage();
            if (typeof Storage !== 'undefined') Storage.showSyncToast('Взнос от Ирины учтён ✅');
        });

        document.getElementById('btn-irina-cancel')?.addEventListener('click', () => {
            row.irinaPaid = false;
            row.irinaPaidDate = null;
            this.save();
            App.closeModal();
            App.renderPage();
        });
    },

    /* --- Модальное окно: Оплата Банку --- */

    showBankPaymentModal(monthNum) {
        const row = this.data.schedule.find(s => s.num === monthNum);
        if (!row) return;

        const isAlreadyPaid = row.bankPaid;
        const curDate = row.bankPaidDate || row.date;

        App.showModal(`🏦 Оплата лизинга банку (Платёж №${row.num})`, `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                    Сумма списания по договору: <strong style="color:var(--text-primary); font-size:16px;">${formatMoney(row.total)}</strong>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                        Тело кредита: ${formatMoney(row.principal)} | Проценты: ${formatMoney(row.interest)}
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Дата списания банком:</label>
                    <input type="text" id="input-bank-pay-date" class="form-input custom-datepicker" value="${curDate}">
                </div>

                <div style="background:var(--bg-card-hover); padding:12px; border-radius:var(--radius); margin-bottom:12px;">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:600;">
                        <input type="checkbox" id="check-bank-add-expense" ${!isAlreadyPaid ? 'checked' : ''}>
                        <span>Списать со счёта «Банк» (-${formatMoney(row.total)})</span>
                    </label>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px; padding-left:24px;">
                        Проведёт расход по категории «Лизинг Toyota» в Журнале.
                    </div>
                </div>
            </div>

            <div class="form-actions">
                ${isAlreadyPaid ? `<button type="button" class="btn btn-danger" id="btn-bank-cancel">Отменить оплату</button>` : ''}
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Закрыть</button>
                <button type="button" class="btn btn-primary" id="btn-bank-confirm">
                    ${isAlreadyPaid ? 'Сохранить изменения' : '💸 Провести оплату'}
                </button>
            </div>
        `);

        document.getElementById('btn-bank-confirm')?.addEventListener('click', () => {
            const payDate = document.getElementById('input-bank-pay-date')?.value || row.date;
            const addExpense = document.getElementById('check-bank-add-expense')?.checked;

            row.bankPaid = true;
            row.bankPaidDate = payDate;

            // Если выбран чекбокс — списываем со счёта Банк
            if (addExpense && typeof Journal !== 'undefined' && typeof Accounts !== 'undefined') {
                const bankAcc = Accounts.getAll().find(a => a.name === 'Банк') || Accounts.getDefault();
                if (bankAcc) {
                    const mandCategories = Categories.getAll('mandatory');
                    const toyotaCat = mandCategories.find(c => c.name.toLowerCase().includes('toyota') || c.name.toLowerCase().includes('лизинг')) || mandCategories[0];
                    Journal.addTransaction({
                        date: payDate,
                        type: 'expense',
                        expenseType: 'mandatory',
                        amount: row.total,
                        accountId: bankAcc.id,
                        categoryId: toyotaCat ? toyotaCat.id : null,
                        note: `Платёж за лизинг Toyota №${row.num}`
                    });
                }
            }

            this.save();
            App.closeModal();
            App.renderPage();
            if (typeof Storage !== 'undefined') Storage.showSyncToast('Платёж банку проведён 🏦');
        });

        document.getElementById('btn-bank-cancel')?.addEventListener('click', () => {
            row.bankPaid = false;
            row.bankPaidDate = null;
            this.save();
            App.closeModal();
            App.renderPage();
        });
    },

    /* --- Модальное окно: Стартовые расходы --- */

    showInitialPaymentModal(id) {
        const exp = this.data.initialExpenses.find(e => e.id === id);
        if (!exp) return;

        App.showModal(`📋 ${exp.name}`, `
            <div style="margin-bottom: 16px;">
                <div class="form-group">
                    <label class="form-label">Дата платежа:</label>
                    <input type="text" id="input-init-date" class="form-input custom-datepicker" value="${exp.date}">
                </div>

                <div class="form-group">
                    <label class="form-label">Общая сумма (€):</label>
                    <input type="number" step="0.01" id="input-init-amount" class="form-input" value="${exp.amount}">
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Оплатил Сергей (€):</label>
                        <input type="number" step="0.01" id="input-init-sergey" class="form-input" value="${exp.paidBySergey || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Оплатила Ирина (€):</label>
                        <input type="number" step="0.01" id="input-init-irina" class="form-input" value="${exp.paidByIrina || 0}">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Примечание:</label>
                    <input type="text" id="input-init-note" class="form-input" value="${exp.note || ''}">
                </div>

                <div class="form-group">
                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                        <input type="checkbox" id="check-init-done" ${exp.isDone ? 'checked' : ''}>
                        <span style="font-size:13px; font-weight:600;">Отметить как выполненный расход</span>
                    </label>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                <button type="button" class="btn btn-primary" id="btn-init-save">Сохранить</button>
            </div>
        `);

        document.getElementById('btn-init-save')?.addEventListener('click', () => {
            exp.date = document.getElementById('input-init-date')?.value || exp.date;
            exp.amount = parseFloat(document.getElementById('input-init-amount')?.value) || 0;
            exp.paidBySergey = parseFloat(document.getElementById('input-init-sergey')?.value) || 0;
            exp.paidByIrina = parseFloat(document.getElementById('input-init-irina')?.value) || 0;
            exp.note = document.getElementById('input-init-note')?.value || '';
            exp.isDone = document.getElementById('check-init-done')?.checked || false;

            this.save();
            App.closeModal();
            App.renderPage();
            if (typeof Storage !== 'undefined') Storage.showSyncToast('Стартовый взнос сохранён 📋');
        });
    },

    /* --- Редактирование конкретного месяца (EURIBOR) --- */

    showEditMonthModal(monthNum) {
        const row = this.data.schedule.find(s => s.num === monthNum);
        if (!row) return;

        App.showModal(`✏️ Редактирование платежа №${row.num}`, `
            <div style="margin-bottom: 16px;">
                <div class="form-group">
                    <label class="form-label">Дата платежа:</label>
                    <input type="text" id="input-edit-date" class="form-input custom-datepicker" value="${row.date}">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Тело кредита (€):</label>
                        <input type="number" step="0.01" id="input-edit-principal" class="form-input" value="${row.principal}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Проценты (€):</label>
                        <input type="number" step="0.01" id="input-edit-interest" class="form-input" value="${row.interest}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Итоговая сумма банку (€):</label>
                    <input type="number" step="0.01" id="input-edit-total" class="form-input" value="${row.total}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                <button type="button" class="btn btn-primary" id="btn-edit-save">Сохранить</button>
            </div>
        `);

        // Авто-пересчёт total при изменении principal или interest
        const pInput = document.getElementById('input-edit-principal');
        const iInput = document.getElementById('input-edit-interest');
        const tInput = document.getElementById('input-edit-total');

        const updateTot = () => {
            const p = parseFloat(pInput?.value) || 0;
            const i = parseFloat(iInput?.value) || 0;
            if (tInput) tInput.value = (p + i).toFixed(2);
        };
        pInput?.addEventListener('input', updateTot);
        iInput?.addEventListener('input', updateTot);

        document.getElementById('btn-edit-save')?.addEventListener('click', () => {
            row.date = document.getElementById('input-edit-date')?.value || row.date;
            row.principal = parseFloat(pInput?.value) || 0;
            row.interest = parseFloat(iInput?.value) || 0;
            row.total = parseFloat(tInput?.value) || (row.principal + row.interest);
            row.irinaShare = +(row.total / 2).toFixed(2);
            row.sergeyShare = +(row.total - row.irinaShare).toFixed(2);

            this.save();
            App.closeModal();
            App.renderPage();
        });
    },

    /* --- Модальное окно настроек договора --- */

    showSettingsModal() {
        const c = this.data.contract;

        App.showModal('⚙️ Параметры договора лизинга', `
            <div style="margin-bottom: 16px;">
                <div class="form-group">
                    <label class="form-label">Модель авто:</label>
                    <input type="text" id="input-sett-asset" class="form-input" value="${c.assetName}">
                </div>
                <div class="form-group">
                    <label class="form-label">Номер договора:</label>
                    <input type="text" id="input-sett-no" class="form-input" value="${c.contractNo}">
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Банк / Лизингодатель:</label>
                        <input type="text" id="input-sett-bank" class="form-input" value="${c.bankName}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Поставщик / Дилер:</label>
                        <input type="text" id="input-sett-dealer" class="form-input" value="${c.dealerName}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Условия процентной ставки:</label>
                    <input type="text" id="input-sett-rate" class="form-input" value="${c.rateDescription}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                <button type="button" class="btn btn-primary" id="btn-sett-save">Сохранить</button>
            </div>
        `);

        document.getElementById('btn-sett-save')?.addEventListener('click', () => {
            c.assetName = document.getElementById('input-sett-asset')?.value || c.assetName;
            c.contractNo = document.getElementById('input-sett-no')?.value || c.contractNo;
            c.bankName = document.getElementById('input-sett-bank')?.value || c.bankName;
            c.dealerName = document.getElementById('input-sett-dealer')?.value || c.dealerName;
            c.rateDescription = document.getElementById('input-sett-rate')?.value || c.rateDescription;

            this.save();
            App.closeModal();
            App.renderPage();
        });
    }
};
