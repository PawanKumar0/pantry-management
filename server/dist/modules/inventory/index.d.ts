import { z } from 'zod';
import { Response, Request } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodNumber>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    sortOrder: number;
    description?: string | undefined;
    icon?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    sortOrder?: number | undefined;
}>;
export declare const updateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    icon: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    sortOrder?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    icon?: string | undefined;
    sortOrder?: number | undefined;
}>;
export declare const createItemSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodString;
    price: z.ZodDefault<z.ZodNumber>;
    isFree: z.ZodDefault<z.ZodBoolean>;
    image: z.ZodOptional<z.ZodString>;
    stock: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
    options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    categoryId: string;
    price: number;
    isFree: boolean;
    lowStockThreshold: number;
    options?: Record<string, string[]> | undefined;
    description?: string | undefined;
    image?: string | undefined;
    stock?: number | undefined;
}, {
    name: string;
    categoryId: string;
    options?: Record<string, string[]> | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    price?: number | undefined;
    isFree?: boolean | undefined;
    image?: string | undefined;
    stock?: number | undefined;
    lowStockThreshold?: number | undefined;
}>;
export declare const updateItemSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    categoryId: z.ZodOptional<z.ZodString>;
    price: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isFree: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    image: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    stock: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    lowStockThreshold: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    options: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    options?: Record<string, string[]> | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    categoryId?: string | undefined;
    price?: number | undefined;
    isFree?: boolean | undefined;
    image?: string | undefined;
    stock?: number | undefined;
    lowStockThreshold?: number | undefined;
}, {
    options?: Record<string, string[]> | undefined;
    name?: string | undefined;
    description?: string | undefined;
    isActive?: boolean | undefined;
    categoryId?: string | undefined;
    price?: number | undefined;
    isFree?: boolean | undefined;
    image?: string | undefined;
    stock?: number | undefined;
    lowStockThreshold?: number | undefined;
}>;
export declare class CategoryService {
    create(orgId: string, data: z.infer<typeof createCategorySchema>): Promise<{
        id: string;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        sortOrder: number;
    }>;
    findByOrg(orgId: string, includeInactive?: boolean): Promise<({
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        sortOrder: number;
    })[]>;
    findById(id: string, orgId: string): Promise<{
        items: {
            options: import("@prisma/client/runtime/library").JsonValue | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            icon: string | null;
            categoryId: string;
            price: Decimal;
            isFree: boolean;
            image: string | null;
            stock: number | null;
            lowStockThreshold: number;
            autoIcon: boolean;
            isAvailable: boolean;
        }[];
    } & {
        id: string;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        sortOrder: number;
    }>;
    update(id: string, orgId: string, data: z.infer<typeof updateCategorySchema>): Promise<{
        id: string;
        name: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        sortOrder: number;
    }>;
    delete(id: string, orgId: string): Promise<void>;
}
export declare class ItemService {
    create(orgId: string, data: z.infer<typeof createItemSchema>): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    }>;
    findByCategory(categoryId: string, includeUnavailable?: boolean): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    }[]>;
    findByOrg(orgId: string, includeInactive?: boolean): Promise<({
        category: {
            id: string;
            name: string;
            icon: string | null;
        };
    } & {
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    })[]>;
    findById(id: string): Promise<{
        category: {
            id: string;
            name: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            isActive: boolean;
            icon: string | null;
            sortOrder: number;
        };
    } & {
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    }>;
    update(id: string, orgId: string, data: z.infer<typeof updateItemSchema>): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    }>;
    delete(id: string, orgId: string): Promise<void>;
    updateStock(id: string, quantity: number): Promise<{
        options: import("@prisma/client/runtime/library").JsonValue | null;
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        isActive: boolean;
        icon: string | null;
        categoryId: string;
        price: Decimal;
        isFree: boolean;
        image: string | null;
        stock: number | null;
        lowStockThreshold: number;
        autoIcon: boolean;
        isAvailable: boolean;
    }>;
}
export declare class InventoryController {
    private categoryService;
    private itemService;
    constructor(categoryService?: CategoryService, itemService?: ItemService);
    createCategory: (req: Request, res: Response) => Promise<void>;
    listCategories: (req: Request, res: Response) => Promise<void>;
    getCategory: (req: Request, res: Response) => Promise<void>;
    updateCategory: (req: Request, res: Response) => Promise<void>;
    deleteCategory: (req: Request, res: Response) => Promise<void>;
    createItem: (req: Request, res: Response) => Promise<void>;
    listItems: (req: Request, res: Response) => Promise<void>;
    getItem: (req: Request, res: Response) => Promise<void>;
    updateItem: (req: Request, res: Response) => Promise<void>;
    deleteItem: (req: Request, res: Response) => Promise<void>;
}
export declare function inventoryRoutes(): import("express-serve-static-core").Router;
//# sourceMappingURL=index.d.ts.map