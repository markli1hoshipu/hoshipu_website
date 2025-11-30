import React, { useState, useRef } from 'react';
import ActionFlipCard from './ActionFlipCard';
import InsightModal from './InsightModal';
import { AlertCircle, Users, DollarSign, Shield, TrendingUp, Target } from 'lucide-react';

const SECTION_CONFIG = [
  {
    key: 'todays_priorities',
    title: "Today's Priorities",
    icon: AlertCircle
  },
  {
    key: 'customer_engagement',
    title: 'Customer Engagement',
    icon: Users
  },
  {
    key: 'revenue_opportunities',
    title: 'Revenue Opportunities',
    icon: DollarSign
  },
  {
    key: 'business_risk_assessment',
    title: 'Risk Assessment',
    icon: Shield
  },
  {
    key: 'performance_intelligence',
    title: 'Performance Intelligence',
    icon: TrendingUp
  },
  {
    key: 'strategic_initiatives',
    title: 'Strategic Initiatives',
    icon: Target
  }
];

const ActionCardsGrid = ({ actionsData }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [cardPosition, setCardPosition] = useState(null);
  const [navigationDirection, setNavigationDirection] = useState(null);
  const cardRefs = useRef([]);

  if (!actionsData) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No action data available
      </div>
    );
  }

  // Build insights array with all data
  const insights = SECTION_CONFIG.map((config) => {
    const sectionData = actionsData[config.key] || {};

    // Check if data is available (from backend meta.data_available flag)
    const dataAvailable = sectionData.data_available !== false;
    const situation = dataAvailable
      ? (sectionData.situation || 'No information available')
      : (sectionData.situation || '暂无足够数据生成此分析');

    return {
      key: config.key,
      title: config.title,
      icon: config.icon,
      situation: situation,
      actions: sectionData.actions || [],
      dataAvailable: dataAvailable
    };
  });

  const handleCardClick = (index, element) => {
    if (element) {
      const rect = element.getBoundingClientRect();
      setCardPosition(rect);
    }
    setNavigationDirection(null); // Reset direction on initial open
    setSelectedIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedIndex(null);
    setCardPosition(null);
    setNavigationDirection(null);
  };

  const handleNavigate = (newIndex) => {
    const direction = newIndex > selectedIndex ? 'next' : 'prev';
    setNavigationDirection(direction);
    setSelectedIndex(newIndex);
    // Don't update card position on navigation, use the original card position
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.map((insight, index) => (
          <ActionFlipCard
            key={insight.key}
            ref={(el) => (cardRefs.current[index] = el)}
            title={insight.title}
            situation={insight.situation}
            actions={insight.actions}
            icon={insight.icon}
            dataAvailable={insight.dataAvailable}
            onCardClick={() => handleCardClick(index, cardRefs.current[index])}
          />
        ))}
      </div>

      <InsightModal
        isOpen={selectedIndex !== null}
        onClose={handleCloseModal}
        insights={insights}
        currentIndex={selectedIndex || 0}
        onNavigate={handleNavigate}
        cardPosition={cardPosition}
        navigationDirection={navigationDirection}
      />
    </>
  );
};

export default ActionCardsGrid;