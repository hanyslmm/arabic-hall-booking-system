import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis 
} from '@/components/ui/pagination';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useIsMobile } from '@/hooks/use-mobile';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
  mobileLabel?: string; // Label to show in mobile card view
  hideOnMobile?: boolean; // Hide this column on mobile
}

export interface TableAction<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: React.ReactNode;
  className?: string;
}

interface MobileResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  actions?: TableAction<T>[];
  title?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  getRowKey: (item: T) => string;
  expandedContent?: (item: T) => React.ReactNode;
  itemsPerPage?: number;
  className?: string;
  // Server-side pagination support (optional)
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function MobileResponsiveTable<T>({
  data = [],
  columns,
  actions,
  title,
  isLoading,
  emptyMessage = "لا توجد بيانات",
  emptyIcon,
  getRowKey,
  expandedContent,
  itemsPerPage = 10,
  className,
  serverSide = false,
  totalItems: totalItemsProp,
  currentPage: currentPageProp,
  onPageChange,
}: MobileResponsiveTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();
  
  const {
    currentData: clientCurrentData,
    currentPage: clientCurrentPage,
    totalPages: clientTotalPages,
    goToPage: clientGoToPage,
    nextPage: clientNextPage,
    prevPage: clientPrevPage,
    canGoNext: clientCanGoNext,
    canGoPrev: clientCanGoPrev,
    startIndex: clientStartIndex,
    endIndex: clientEndIndex,
    totalItems: clientTotalItems
  } = usePagination({ data, itemsPerPage });

  // Derive pagination values depending on mode
  const totalItems = serverSide ? (totalItemsProp || 0) : clientTotalItems;
  const totalPages = serverSide ? Math.max(1, Math.ceil((totalItems || 0) / itemsPerPage)) : clientTotalPages;
  const currentPage = serverSide ? (currentPageProp || 1) : clientCurrentPage;
  const currentData = serverSide ? data : clientCurrentData;

  const goToPage = (page: number) => {
    if (serverSide) {
      onPageChange && onPageChange(page);
    } else {
      clientGoToPage(page);
    }
  };

  const nextPage = () => goToPage(Math.min(currentPage + 1, totalPages));
  const prevPage = () => goToPage(Math.max(currentPage - 1, 1));
  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const startIndex = serverSide
    ? Math.min((currentPage - 1) * itemsPerPage + 1, Math.max(totalItems, 1))
    : clientStartIndex;
  const endIndex = serverSide
    ? Math.min(startIndex + (currentData?.length || 0) - 1, totalItems)
    : clientEndIndex;

  const toggleRowExpansion = (rowKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = isMobile ? 3 : 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => goToPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
            size={isMobile ? 'sm' : 'default'}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is far from start
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => goToPage(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
              size={isMobile ? 'sm' : 'default'}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
  };

  // Mobile card view
  const renderMobileCards = () => {
    return (
      <div className="space-y-4">
        {currentData.map((item) => {
          const rowKey = getRowKey(item);
          const isExpanded = expandedRows.has(rowKey);
          
          return (
            <Card key={rowKey} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {columns.filter(col => !col.hideOnMobile).map((column) => (
                    <div key={column.key} className="flex justify-between items-start gap-2">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                        {column.mobileLabel || column.header}:
                      </span>
                      <div className="text-sm text-right min-w-0 flex-1">
                        {column.render(item)}
                      </div>
                    </div>
                  ))}
                  
                  {/* Actions */}
                  {actions && actions.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action, index) => (
                          <Button
                            key={index}
                            variant={action.variant || 'outline'}
                            size="sm"
                            onClick={() => action.onClick(item)}
                            className={cn("flex items-center gap-1", action.className)}
                          >
                            {action.icon}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse for additional content */}
                  {expandedContent && (
                    <div className="pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRowExpansion(rowKey)}
                        className="w-full justify-center"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            إخفاء التفاصيل
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-4 w-4 mr-2" />
                            عرض التفاصيل
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Expanded content */}
                {expandedContent && isExpanded && (
                  <div className="mt-4 pt-4 border-t bg-muted/20 -mx-4 px-4">
                    {expandedContent(item)}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Desktop table view
  const renderDesktopTable = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {expandedContent && <TableHead className="w-12"></TableHead>}
              {columns.map((column) => (
                <TableHead key={column.key} className={cn("text-right", column.className)}>
                  {column.header}
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="text-right">الإجراءات</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item) => {
              const rowKey = getRowKey(item);
              const isExpanded = expandedRows.has(rowKey);
              
              return (
                <React.Fragment key={rowKey}>
                  <TableRow>
                    {expandedContent && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(rowKey)}
                          className="p-0 h-8 w-8"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(item)}
                      </TableCell>
                    ))}
                    {actions && actions.length > 0 && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actions.map((action, index) => (
                            <Button
                              key={index}
                              variant={action.variant || 'outline'}
                              size={action.size || 'sm'}
                              onClick={() => action.onClick(item)}
                              className={cn("flex items-center gap-1", action.className)}
                            >
                              {action.icon}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedContent && isExpanded && (
                    <TableRow>
                      <TableCell 
                        colSpan={columns.length + (actions ? 1 : 0) + 1}
                        className="bg-muted/50 p-4"
                      >
                        {expandedContent(item)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p>جاري التحميل...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-lg sm:text-xl">{title}</span>
            {totalItems > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({totalItems} عنصر)
              </span>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {currentData.length === 0 ? (
          <div className="text-center py-8">
            {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {/* Render mobile cards or desktop table based on screen size */}
            {isMobile ? renderMobileCards() : renderDesktopTable()}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                  عرض {startIndex} إلى {endIndex} من {totalItems} عنصر
                </div>
                <Pagination className="order-1 sm:order-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={prevPage}
                        className={cn(
                          "cursor-pointer",
                          !canGoPrev && "pointer-events-none opacity-50"
                        )}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {isMobile ? 'السابق' : 'السابق'}
                      </PaginationPrevious>
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={nextPage}
                        className={cn(
                          "cursor-pointer",
                          !canGoNext && "pointer-events-none opacity-50"
                        )}
                        size={isMobile ? 'sm' : 'default'}
                      >
                        {isMobile ? 'التالي' : 'التالي'}
                      </PaginationNext>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}