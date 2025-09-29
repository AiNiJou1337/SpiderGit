'use client'

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils/helpers"

// 修改接口，移除不可序列化的函数
interface RangeSliderProps {
  value: [number, number]
  min: number
  max: number
  step?: number
  className?: string
  disabled?: boolean
}

// 创建一个包装组件来处理值变化
interface RangeSliderWrapperProps extends RangeSliderProps {
  onValueChange?: (value: [number, number]) => void
}

export function RangeSlider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  className,
  disabled = false,
  ...props
}: RangeSliderWrapperProps) {
  // 新思路：固定最小值为0，确保左端点可以拖动到0
  const actualMin = 0
  const actualMax = max
  
  // 确保值在有效范围内
  const safeValue: [number, number] = [
    Math.max(actualMin, Math.min(actualMax, value[0])),
    Math.max(actualMin, Math.min(actualMax, value[1]))
  ]

  const handleValueChange = (newValue: number[]) => {
    // 确保左值不大于右值
    let leftValue = newValue[0] || actualMin
    const rightValue = newValue[1] || actualMax
    
    if (leftValue > rightValue) {
      leftValue = rightValue
    }
    
    const finalValue: [number, number] = [leftValue, rightValue]
    // 只有当onValueChange存在时才调用
    if (onValueChange) {
      onValueChange(finalValue)
    }
  }

  return (
    <SliderPrimitive.Root
      value={safeValue}
      onValueChange={handleValueChange}
      min={actualMin}
      max={actualMax}
      step={step}
      disabled={disabled}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary/50">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      
      {/* 左侧滑块 - 控制最小值选择 */}
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/10">
        <span className="sr-only">最小值</span>
      </SliderPrimitive.Thumb>
      
      {/* 右侧滑块 - 控制最大值选择 */}
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-primary/10">
        <span className="sr-only">最大值</span>
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  )
}

// 简化版本，保持原有接口兼容性
export function SimpleRangeSlider(props: RangeSliderWrapperProps) {
  return <RangeSlider {...props} />
}