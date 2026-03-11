'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Event, TicketType } from '@/types';

interface BookingWidgetProps {
    event: Event;
    ticketTypes: TicketType[];
}

export default function BookingWidget({ ticketTypes }: BookingWidgetProps) {
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);

    const handleTicketChange = (ticketId: string, delta: number) => {
        const ticket = ticketTypes.find(t => t.id === ticketId);
        if (!ticket) return;

        const currentQuantity = selectedTickets[ticketId] || 0;
        const newQuantity = currentQuantity + delta;

        if (newQuantity < 0) return;
        if (newQuantity > ticket.max_per_order) return;

        // Check total availability
        const available = ticket.quantity_total - ticket.quantity_sold;
        if (newQuantity > available) return;

        setSelectedTickets(prev => ({
            ...prev,
            [ticketId]: newQuantity
        }));
    };

    const calculateSubtotal = () => {
        let subtotal = 0;
        for (const [ticketId, quantity] of Object.entries(selectedTickets)) {
            const ticket = ticketTypes.find(t => t.id === ticketId);
            if (ticket) {
                subtotal += ticket.price_pence * quantity;
            }
        }
        return subtotal;
    };

    const applyPromoCode = () => {
        // Mock promo code logic
        if (promoCode.toUpperCase() === 'EARLY10') {
            const sub = calculateSubtotal();
            setDiscount(Math.round(sub * 0.1)); // 10% off
        } else {
            setDiscount(0);
            alert('Invalid Promo Code');
        }
    };

    const subtotal = calculateSubtotal();
    const platformFee = Math.round((subtotal - discount) * 0.06); // 6% fee
    const total = subtotal - discount + platformFee;

    const hasSelectedTickets = Object.values(selectedTickets).some(q => q > 0);
    const isAllSoldOut = ticketTypes.every(t => (t.quantity_total - t.quantity_sold) <= 0);

    if (isAllSoldOut) {
        return (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24">
                <h3 className="text-xl font-bold mb-4">Tickets</h3>
                <div className="bg-destructive/10 text-destructive text-center p-4 rounded-lg mb-6 font-semibold">
                    This event is completely sold out.
                </div>
                <Button className="w-full h-12 text-lg font-bold">Join Waitlist</Button>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm sticky top-24 flex flex-col gap-6">
            <h3 className="text-xl font-bold">Select Tickets</h3>

            <div className="space-y-4">
                {ticketTypes.map(ticket => {
                    const available = ticket.quantity_total - ticket.quantity_sold;
                    const isSoldOut = available <= 0;
                    const quantity = selectedTickets[ticket.id] || 0;

                    return (
                        <div key={ticket.id} className={`p-4 border rounded-lg flex flex-col gap-3 ${isSoldOut ? 'opacity-50 bg-muted/30' : 'bg-background hover:border-primary/50 transition-colors'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold">{ticket.name}</h4>
                                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-lg">£{(ticket.price_pence / 100).toFixed(2)}</div>
                                    {isSoldOut ? (
                                        <span className="text-xs text-destructive font-medium uppercase tracking-wide">Sold Out</span>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">{available} left</span>
                                    )}
                                </div>
                            </div>

                            {!isSoldOut && (
                                <div className="flex justify-end items-center gap-4 border-t pt-3 mt-1">
                                    <div className="flex items-center gap-3 bg-muted/30 rounded-full border px-2 py-1">
                                        <button
                                            onClick={() => handleTicketChange(ticket.id, -1)}
                                            disabled={quantity === 0}
                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-50 text-xl font-medium"
                                        >
                                            -
                                        </button>
                                        <span className="w-6 text-center font-bold">{quantity}</span>
                                        <button
                                            onClick={() => handleTicketChange(ticket.id, 1)}
                                            disabled={quantity >= ticket.max_per_order || quantity >= available}
                                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-50 text-xl font-medium"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {subtotal > 0 && (
                <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Promo code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            className="flex-1 uppercase"
                        />
                        <Button variant="outline" onClick={applyPromoCode}>Apply</Button>
                    </div>

                    <div className="space-y-2 text-sm bg-muted/20 p-4 rounded-lg border">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>£{(subtotal / 100).toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                                <span>Discount</span>
                                <span>-£{(discount / 100).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform Fee (6%)</span>
                            <span>£{(platformFee / 100).toFixed(2)}</span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>£{(total / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

            <Button
                className="w-full h-14 text-lg font-bold mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={!hasSelectedTickets}
            >
                Proceed to Checkout
            </Button>
        </div>
    );
}
