document.addEventListener('DOMContentLoaded', () => {
  if (typeof SizeChartUI === 'undefined') return;

  SizeChartUI.initModal({
    openBtnId: 'shop-size-chart-btn',
    closeBtnId: 'shop-size-chart-close',
    modalId: 'shop-size-chart-modal',
    genderSelectId: 'shop-size-chart-gender',
    systemSelectId: 'shop-size-chart-system',
    widthSelectId: 'shop-size-chart-width',
    tableBodyId: 'shop-size-chart-body',
    sizeHeaderId: 'shop-size-chart-size-header',
    statusId: 'shop-size-chart-status',
    scrollContainerId: 'shop-size-chart-scroll',
    scrollUpBtnId: 'shop-size-chart-scroll-up',
    scrollDownBtnId: 'shop-size-chart-scroll-down',
    defaultSystem: 'UK'
  });
});
