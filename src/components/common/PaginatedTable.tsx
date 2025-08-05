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

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableAction<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  icon?: React.ReactNode;
  className?: string;
}

interface PaginatedTableProps<T> {
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
}

export function PaginatedTable<T>({
  data = [],
  columns,
  actions,
  title,
  isLoading,
  emptyMessage = "لا توجد بيانات",
  emptyIcon,
  getRowKey,
  expandedContent,
  itemsPerPage = 50,
  className
}: PaginatedTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const {
    currentData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    canGoNext,
    canGoPrev,
    startIndex,
    endIndex,
    totalItems
  } = usePagination({ data, itemsPerPage });

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
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
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
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    return items;
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
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  عرض {startIndex} إلى {endIndex} من {totalItems} عنصر
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={prevPage}
                        className={cn(
                          "cursor-pointer",
                          !canGoPrev && "pointer-events-none opacity-50"
                        )}
                      >
                        السابق
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
                      >
                        التالي
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