import React, { forwardRef } from 'react';
import { Card } from '../ui/primitives/card';

const ActionFlipCard = forwardRef(({ title, situation, actions, icon: Icon, onCardClick, dataAvailable = true }, ref) => {
  const actionCount = actions?.length || 0;

  // Different styling for insufficient data
  const cardClassName = dataAvailable
    ? "h-64 p-6 border border-border bg-card flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200"
    : "h-64 p-6 border border-gray-300 bg-gray-50 flex flex-col cursor-pointer hover:shadow-md transition-shadow duration-200 opacity-75";

  const iconClassName = dataAvailable ? "w-5 h-5 text-foreground" : "w-5 h-5 text-gray-400";
  const titleClassName = dataAvailable ? "text-lg font-semibold text-foreground" : "text-lg font-semibold text-gray-600";
  const situationClassName = dataAvailable ? "text-sm text-muted-foreground leading-relaxed line-clamp-6" : "text-sm text-gray-500 leading-relaxed line-clamp-6 italic";

  return (
    <Card
      ref={ref}
      className={cardClassName}
      onClick={onCardClick}
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className={iconClassName} />}
        <h3 className={titleClassName}>{title}</h3>
      </div>

      <div className="flex-1 overflow-hidden">
        <p className={situationClassName}>
          {situation || (dataAvailable ? 'No situation details available' : '暂无足够数据生成此分析')}
        </p>
      </div>

      <div className="pt-4 mt-auto border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {dataAvailable ? (
              <>{actionCount} {actionCount === 1 ? 'Action' : 'Actions'}</>
            ) : (
              <>数据不足</>
            )}
          </span>
          <span>Click to view →</span>
        </div>
      </div>
    </Card>
  );
});

ActionFlipCard.displayName = 'ActionFlipCard';

export default ActionFlipCard;